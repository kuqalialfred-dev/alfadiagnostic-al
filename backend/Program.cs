using System.Security.Claims;
using System.Security.Cryptography;
using System.Net;
using System.Text.Json;
using AlfaDiagnostic;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var databaseUrl = builder.Configuration["DATABASE_URL"];
if (string.IsNullOrWhiteSpace(databaseUrl) || !CanResolveDatabaseHost(databaseUrl))
{
    if (!string.IsNullOrWhiteSpace(databaseUrl))
        builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
    builder.Services.AddDbContext<AlfaDb>(o => o.UseSqlite("Data Source=alfadiagnostic.db"));
}
else
    builder.Services.AddDbContext<AlfaDb>(o => o.UseNpgsql(ToNpgsqlConnectionString(databaseUrl)));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "alfa_admin"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict; o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromHours(12); o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = context => { context.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
});
builder.Services.AddAuthorization(o => o.AddPolicy("admin", p => p.RequireAuthenticatedUser().RequireClaim("role", "admin")));

var app = builder.Build();
app.UseExceptionHandler("/error");
app.UseStaticFiles();
app.UseAuthentication(); app.UseAuthorization();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AlfaDb>();
    await db.Database.EnsureCreatedAsync();
    await db.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS \"KnowledgePages\" (\"Slug\" text NOT NULL PRIMARY KEY, \"Title\" text NOT NULL, \"Category\" text NOT NULL, \"Section\" text NOT NULL, \"Body\" text NOT NULL, \"SourceName\" text NOT NULL, \"UpdatedAt\" timestamp with time zone NOT NULL)");
    await Seed(db);
}

app.MapGet("/api/content", async (AlfaDb db) => await db.Content.ToDictionaryAsync(x => x.Key, x => x.Value));
app.MapGet("/api/articles", async (AlfaDb db) => await db.Articles.OrderByDescending(x => x.PublishedAt).Select(x => new { x.Id, x.Title, x.Excerpt, x.Body, x.Category, x.ImageId, x.PublishedAt }).ToListAsync());
app.MapGet("/api/articles/{id:guid}", async (Guid id, AlfaDb db) =>
{
    var article = await db.Articles.FindAsync(id);
    return article is null ? Results.NotFound() : Results.Ok(new { article.Id, article.Title, article.Excerpt, article.Body, article.Category, article.ImageId, article.PublishedAt });
});
app.MapGet("/api/knowledge", async (AlfaDb db) =>
{
    var pages = await db.KnowledgePages.OrderBy(x => x.Category).ThenBy(x => x.Section).ThenBy(x => x.Title).ToListAsync();
    return pages.Select(page => new
    {
        page.Slug,
        Title = DisplayLabel(page.Title),
        Category = DisplayLabel(page.Category),
        Section = DisplayLabel(page.Section)
    });
});
app.MapGet("/api/knowledge/{slug}", async (string slug, AlfaDb db) =>
{
    var page = await db.KnowledgePages.FindAsync(slug);
    return page is null ? Results.NotFound() : Results.Ok(new
    {
        page.Slug,
        Title = DisplayLabel(page.Title),
        Category = DisplayLabel(page.Category),
        Section = DisplayLabel(page.Section),
        page.Body
    });
});
app.MapGet("/api/images/{id:guid}", async Task<Results<FileContentHttpResult, NotFound>>(Guid id, AlfaDb db) => { var image = await db.Images.FindAsync(id); return image is null ? TypedResults.NotFound() : TypedResults.File(image.Bytes, image.ContentType, enableRangeProcessing: true); });
app.MapPost("/api/contact", async (ContactRequest request, AlfaDb db) =>
{
    if (new[] { request.Name, request.Email, request.Message }.Any(string.IsNullOrWhiteSpace)) return Results.BadRequest(new { error = "Plotësoni të gjitha fushat." });
    db.ContactMessages.Add(new ContactMessage { Name = request.Name.Trim(), Email = request.Email.Trim(), Message = request.Message.Trim() }); await db.SaveChangesAsync(); return Results.Created();
});
app.MapPost("/api/admin/login", async Task<Results<Ok, UnauthorizedHttpResult>>(LoginRequest request, HttpContext context, IConfiguration config) =>
{
    var expected = config["ADMIN_PASSCODE"] ?? string.Empty; var actual = request.Password ?? string.Empty;
    if (actual.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(actual), System.Text.Encoding.UTF8.GetBytes(expected))) return TypedResults.Unauthorized();
    await context.SignInAsync(new ClaimsPrincipal(new ClaimsIdentity([new Claim("role", "admin")], CookieAuthenticationDefaults.AuthenticationScheme))); return TypedResults.Ok();
});
app.MapGet("/api/admin/session", () => Results.Ok(new { authenticated = true })).RequireAuthorization("admin");
app.MapPost("/api/admin/logout", async (HttpContext context) => { await context.SignOutAsync(); return Results.Ok(); }).RequireAuthorization("admin");
app.MapPut("/api/admin/content/{key}", async (string key, ValueRequest request, AlfaDb db) =>
{
    if (string.IsNullOrWhiteSpace(request.Value) || request.Value.Length > 8000) return Results.BadRequest(new { error = "Vlerë e pavlefshme." });
    var item = await db.Content.FindAsync(key); if (item is null) db.Content.Add(new SiteContent { Key = key, Value = request.Value }); else { item.Value = request.Value; item.UpdatedAt = DateTimeOffset.UtcNow; } await db.SaveChangesAsync(); return Results.Ok();
}).RequireAuthorization("admin");
app.MapPost("/api/admin/images", async (HttpRequest request, AlfaDb db) =>
{
    var form = await request.ReadFormAsync(); var image = form.Files.GetFile("image");
    if (image is null || !image.ContentType.StartsWith("image/") || image.Length > 5 * 1024 * 1024) return Results.BadRequest(new { error = "Ngarkoni një imazh deri në 5 MB." });
    await using var stream = new MemoryStream(); await image.CopyToAsync(stream); var asset = new ImageAsset { FileName = image.FileName, ContentType = image.ContentType, Bytes = stream.ToArray() }; db.Images.Add(asset); await db.SaveChangesAsync(); return Results.Created($"/api/images/{asset.Id}", new { id = asset.Id, url = $"/api/images/{asset.Id}" });
}).RequireAuthorization("admin");
app.MapPost("/api/admin/articles", async (ArticleRequest request, AlfaDb db) => { var article = ToArticle(request); if (article is null) return Results.BadRequest(new { error = "Titulli dhe përmbledhja janë të detyrueshme." }); db.Articles.Add(article); await db.SaveChangesAsync(); return Results.Created($"/api/articles/{article.Id}", article); }).RequireAuthorization("admin");
app.MapPut("/api/admin/articles/{id:guid}", async (Guid id, ArticleRequest request, AlfaDb db) => { var article = await db.Articles.FindAsync(id); var values = ToArticle(request); if (article is null) return Results.NotFound(); if (values is null) return Results.BadRequest(new { error = "Të dhëna të pavlefshme." }); article.Title = values.Title; article.Excerpt = values.Excerpt; article.Body = values.Body; article.Category = values.Category; article.ImageId = values.ImageId; await db.SaveChangesAsync(); return Results.Ok(article); }).RequireAuthorization("admin");
app.MapDelete("/api/admin/articles/{id:guid}", async (Guid id, AlfaDb db) => { var article = await db.Articles.FindAsync(id); if (article is null) return Results.NotFound(); db.Articles.Remove(article); await db.SaveChangesAsync(); return Results.NoContent(); }).RequireAuthorization("admin");
app.MapFallbackToFile("index.html");
app.Run();

static Article? ToArticle(ArticleRequest request) => string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Excerpt) ? null : new Article { Title = request.Title.Trim(), Excerpt = request.Excerpt.Trim(), Body = (request.Body ?? string.Empty).Trim(), Category = string.IsNullOrWhiteSpace(request.Category) ? "Artikuj" : request.Category.Trim(), ImageId = request.ImageId };
static string ToNpgsqlConnectionString(string value)
{
    if (!value.StartsWith("postgres", StringComparison.OrdinalIgnoreCase)) return value;
    var uri = new Uri(value); var credentials = uri.UserInfo.Split(':', 2);
    var port = uri.IsDefaultPort ? 5432 : uri.Port;
    return $"Host={uri.Host};Port={port};Database={uri.AbsolutePath.Trim('/')};Username={Uri.UnescapeDataString(credentials[0])};Password={Uri.UnescapeDataString(credentials.ElementAtOrDefault(1) ?? string.Empty)};SSL Mode=Require;Trust Server Certificate=true";
}
static bool CanResolveDatabaseHost(string value)
{
    try
    {
        string host;
        if (value.StartsWith("postgres", StringComparison.OrdinalIgnoreCase)) host = new Uri(value).Host;
        else host = value.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .FirstOrDefault(part => part.Length == 2 && part[0].Trim().Equals("Host", StringComparison.OrdinalIgnoreCase))?[1].Trim() ?? string.Empty;
        return !string.IsNullOrWhiteSpace(host) && Dns.GetHostAddresses(host).Length > 0;
    }
    catch (Exception)
    {
        return false;
    }
}
static async Task Seed(AlfaDb db)
{
    var content = new Dictionary<string, string> { ["about"] = "Laboratori Alfa u themelua në tetor të vitit 2008 në Tiranë nga Dr. Najada Gjylameti. Që prej krijimit, fokusi ynë ka mbetur i njëjtë: diagnostikim laboratorik i besueshëm, profesional dhe i mbështetur në standarde bashkëkohore.", ["history"] = "Laboratori Alfa është zhvilluar në mënyrë të qëndrueshme duke zgjeruar gamën e analizave sipas nevojave të pacientëve dhe mjekëve. Mikrobiologjia ka qenë gjithmonë një nga shtyllat kryesore të aktivitetit tonë, krahas analizave klinike, biokimisë, hormoneve dhe imunologjisë.", ["mission"] = "Të ofrojmë diagnostikim laboratorik të saktë, të besueshëm dhe të mbështetur në prova shkencore, duke ndihmuar mjekët dhe pacientët të marrin vendime të sigurta për shëndetin.", ["contactAddress"] = "Tiranë, Shqipëri", ["contactHours"] = "Për orarin e shërbimit, ju lutemi na kontaktoni.", ["contactPhone"] = "Shtoni numrin e telefonit nga paneli i administratorit.", ["contactEmail"] = "Shtoni email-in nga paneli i administratorit." };
    content["contactHours"] = "E hënë – e premte: 08:00 – 17:00\nE shtunë: 08:00 – 13:00";
    content["contactPhone"] = "068 220 6300\n068 854 6291";
    content["contactAddress"] = "Rruga e Dibrës, në kryqëzim me Rrugën Riza Cerova, Pallati 132, Kati II, Tiranë";
    foreach (var pair in content)
    {
        var existing = await db.Content.FindAsync(pair.Key);
        if (existing is null) db.Content.Add(new SiteContent { Key = pair.Key, Value = pair.Value });
        else if ((pair.Key == "contactHours" && existing.Value.Contains("orarin")) || (pair.Key == "contactPhone" && existing.Value.StartsWith("Shtoni numrin")) || (pair.Key == "contactAddress" && existing.Value == "Tiranë, Shqipëri")) existing.Value = pair.Value;
    }
    if (!await db.Articles.AnyAsync()) db.Articles.AddRange([new Article { Title = "Mikrobiologjia klinike: rëndësia e diagnozës së saktë", Excerpt = "Mikrobiologjia është një nga fushat kryesore të ekspertizës së Laboratorit Alfa.", Category = "Infeksionet" }, new Article { Title = "Analizat parandaluese: një hap i qetë drejt kujdesit për shëndetin", Excerpt = "Kontrollet laboratorike ndihmojnë mjekun të ndjekë tregues të rëndësishëm shëndetësorë.", Category = "Udhëzuesi i pacientit" }, new Article { Title = "Si të përgatitemi për analizat laboratorike?", Excerpt = "Përgatitja e duhur është një pjesë e rëndësishme e cilësisë së rezultatit.", Category = "Këshilla" }]);
    var starterArticles = new[]
    {
        new Article { Title = "Onikomikoza: çfarë përfshin diagnostikimi laboratorik?", Excerpt = "Nga ekzaminimi mikologjik direkt te kultura, mësoni çfarë përdoret për vlerësimin laboratorik të mykut të thonjve.", Category = "Mikologji" },
        new Article { Title = "Si përgatitemi për urokulturë?", Excerpt = "Marrja e saktë e mostrës së urinës është një hap i rëndësishëm për një rezultat të besueshëm laboratorik.", Category = "Bakteriologji" },
        new Article { Title = "Hepatiti B: analizat laboratorike kryesore", Excerpt = "HBsAg, Anti-HBs, Anti-HBc dhe HBV DNA janë disa nga analizat që mund të kërkohen sipas rastit.", Category = "Virologji" },
        new Article { Title = "Çfarë duhet të dini për testet e tiroides", Excerpt = "TSH, FT3 dhe FT4 janë pjesë e katalogut tonë të hormoneve për vlerësimin e funksionit të tiroides.", Category = "Hormonet" },
        new Article { Title = "Pse ka rëndësi përgatitja për analizat?", Excerpt = "Udhëzimet për marrjen e mostrës ndihmojnë në cilësinë dhe besueshmërinë e rezultatit laboratorik.", Category = "Udhëzuesi i pacientit" }
    };
    foreach (var article in starterArticles)
        if (!await db.Articles.AnyAsync(x => x.Title == article.Title)) db.Articles.Add(article);
    var seedPath = Path.Combine(AppContext.BaseDirectory, "SeedData", "knowledge-pages.json");
    if (File.Exists(seedPath))
    {
        var pages = JsonSerializer.Deserialize<List<KnowledgePage>>(await File.ReadAllTextAsync(seedPath), new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        foreach (var page in pages)
            if (!await db.KnowledgePages.AnyAsync(x => x.Slug == page.Slug)) db.KnowledgePages.Add(page);

        var documentBodies = new Dictionary<string, string>
        {
            ["Onikomikoza: çfarë përfshin diagnostikimi laboratorik?"] = pages.FirstOrDefault(x => x.Slug == "1-mykologjia-1-1-infeksionet-e-lekures-thonjve-dhe-flokeve-1-1-01-onikomikoza-myku-i-thonjve")?.Body ?? string.Empty,
            ["Si përgatitemi për urokulturë?"] = pages.FirstOrDefault(x => x.Slug == "2-bakterologji-2-2-infeksione-urinare-2-2-01-infeksionet-urinare")?.Body ?? string.Empty,
            ["Hepatiti B: analizat laboratorike kryesore"] = pages.FirstOrDefault(x => x.Slug == "4-virologji-4-1-hepatitet-virale-4-1-01-hepatiti-b-hbv")?.Body ?? string.Empty
        };
        var articleBodies = new Dictionary<string, string>
        {
            ["Mikrobiologjia klinike: rëndësia e diagnozës së saktë"] = "Mikrobiologjia klinike ndihmon në identifikimin e mikroorganizmave që mund të shkaktojnë infeksione dhe mbështet vendimmarrjen e mjekut me informacion laboratorik të besueshëm.\n\n🧪 Çfarë mund të përfshijë vlerësimi?\n\nSipas mostrës dhe kërkesës së mjekut, ekzaminimi mund të përfshijë kulturën, identifikimin e mikroorganizmit dhe, kur kërkohet, testimin e ndjeshmërisë ndaj antibiotikëve.\n\n📋 Mostra dhe përgatitja\n\nLloji i mostrës varet nga zona e vlerësuar: mund të jetë urinë, sekrecion, material nga plagët ose mostra të tjera biologjike. Marrja e saktë dhe dërgimi i shpejtë i mostrës janë të rëndësishëm për cilësinë e rezultatit.\n\n📌 Rekomandim\n\nPërpara paraqitjes në laborator, kontaktoni Laboratorin Alfa për udhëzime sipas analizës së kërkuar dhe informoni stafin për trajtime antibiotike të kohëve të fundit.",
            ["Analizat parandaluese: një hap i qetë drejt kujdesit për shëndetin"] = "Kontrollet laboratorike periodike mund të ndihmojnë mjekun të ndjekë tregues të rëndësishëm shëndetësorë edhe kur nuk ka shqetësime të dukshme.\n\n🧪 Çfarë përfshin një kontroll?\n\nPërzgjedhja e analizave bëhet sipas moshës, historisë personale dhe familjare, stilit të jetesës dhe këshillës së mjekut. Analizat klinike, biokimike, hormonale ose imunologjike zgjidhen sipas nevojës.\n\n📋 Si të përgatiteni\n\nPyetni paraprakisht nëse analiza kërkon esëll, një orar të caktuar ose kufizime të përkohshme. Mbani me vete informacionin për medikamentet që përdorni.\n\n📌 Hapi i radhës\n\nRezultatet laboratorike duhen interpretuar nga mjeku në kontekstin e gjendjes suaj shëndetësore.",
            ["Si të përgatitemi për analizat laboratorike?"] = "Përgatitja e duhur është pjesë e rëndësishme e procesit laboratorik. Udhëzimet ndryshojnë sipas analizës dhe llojit të mostrës.\n\n📋 Përpara paraqitjes në laborator\n\nKontaktoni laboratorin për të konfirmuar nëse kërkohet të jeni esëll, nëse marrja e mostrës duhet të kryhet në një orar të caktuar dhe si duhet ruajtur ose transportuar mostra, kur ajo merret jashtë laboratorit.\n\n🧪 Informacioni që ndihmon\n\nNjoftoni stafin për medikamentet, suplementet ose trajtimet që mund të ndikojnë në analizën e kërkuar. Mos ndërprisni trajtim pa udhëzimin e mjekut.\n\n📌 Në ditën e analizës\n\nNdiqni udhëzimet e marra, sillni kërkesën e mjekut kur e keni dhe pyesni stafin për çdo paqartësi para marrjes së mostrës.",
            ["Çfarë duhet të dini për testet e tiroides"] = "TSH, FT3 dhe FT4 janë analiza që mund të përdoren për vlerësimin laboratorik të funksionit të tiroides, gjithmonë sipas kërkesës dhe interpretimit të mjekut.\n\n🧪 Analiza që mund të kërkohen\n\nNë varësi të rastit, mund të kërkohen TSH, FT3, FT4 dhe antitrupa të tiroides si Anti-TPO ose Anti-Tg. Zgjedhja e analizave bëhet nga mjeku sipas simptomave, historisë mjekësore dhe nevojës klinike.\n\n📋 Përgatitja\n\nPërpara analizës, njoftoni laboratorin për medikamente ose suplemente që merrni dhe ndiqni udhëzimet e marra. Mos ndryshoni trajtimin pa u konsultuar me mjekun.\n\n📌 Interpretimi\n\nRezultatet nuk lexohen të izoluara: mjeku i vlerëson së bashku me gjendjen klinike dhe analizat e tjera kur është e nevojshme.",
            ["Pse ka rëndësi përgatitja për analizat?"] = "Cilësia e rezultatit laboratorik nis nga përgatitja e saktë. Hapat e thjeshtë para marrjes së mostrës mund të ndihmojnë që analiza të reflektojë sa më mirë gjendjen e vlerësuar.\n\n📋 Udhëzimet janë specifike\n\nDisa analiza kërkojnë esëll, ndërsa për të tjera ka rëndësi koha e marrjes së mostrës, mënyra e mbledhjes ose ruajtja e saj. Për këtë arsye, udhëzimet duhen marrë për analizën konkrete.\n\n🧪 Jepni informacion të plotë\n\nNjoftoni stafin për mjekimet, suplementet dhe trajtimet e fundit. Ky informacion ndihmon që procesi laboratorik të organizohet si duhet.\n\n📌 Kontaktoni paraprakisht\n\nNëse keni paqartësi për përgatitjen, Laboratori Alfa ju orienton përpara paraqitjes tuaj."
        };
        foreach (var pair in documentBodies)
            articleBodies[pair.Key] = pair.Value;
        foreach (var pair in articleBodies)
        {
            var article = await db.Articles.FirstOrDefaultAsync(x => x.Title == pair.Key);
            if (article is not null && string.IsNullOrWhiteSpace(article.Body) && !string.IsNullOrWhiteSpace(pair.Value)) article.Body = pair.Value;
        }
    }
    await db.SaveChangesAsync();
}

static string DisplayLabel(string value) => System.Text.RegularExpressions.Regex.Replace(value, @"^\s*\d+(?:\.\d+)*\.?\s+", string.Empty);
