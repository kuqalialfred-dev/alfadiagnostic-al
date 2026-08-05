using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using AlfaDiagnostic;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var databaseUrl = builder.Configuration["DATABASE_URL"];
if (string.IsNullOrWhiteSpace(databaseUrl))
    builder.Services.AddDbContext<AlfaDb>(o => o.UseSqlite("Data Source=alfadiagnostic.db"));
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
app.MapGet("/api/knowledge", async (AlfaDb db) => await db.KnowledgePages.OrderBy(x => x.Category).ThenBy(x => x.Section).ThenBy(x => x.Title).Select(x => new { x.Slug, x.Title, x.Category, x.Section }).ToListAsync());
app.MapGet("/api/knowledge/{slug}", async (string slug, AlfaDb db) =>
{
    var page = await db.KnowledgePages.FindAsync(slug);
    return page is null ? Results.NotFound() : Results.Ok(new { page.Slug, page.Title, page.Category, page.Section, page.Body });
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
static async Task Seed(AlfaDb db)
{
    var content = new Dictionary<string, string> { ["about"] = "Laboratori Alfa u themelua në tetor të vitit 2008 në Tiranë nga Dr. Najada Gjylameti. Që prej krijimit, fokusi ynë ka mbetur i njëjtë: diagnostikim laboratorik i besueshëm, profesional dhe i mbështetur në standarde bashkëkohore.", ["history"] = "Laboratori Alfa është zhvilluar në mënyrë të qëndrueshme duke zgjeruar gamën e analizave sipas nevojave të pacientëve dhe mjekëve. Mikrobiologjia ka qenë gjithmonë një nga shtyllat kryesore të aktivitetit tonë, krahas analizave klinike, biokimisë, hormoneve dhe imunologjisë.", ["mission"] = "Të ofrojmë diagnostikim laboratorik të saktë, të besueshëm dhe të mbështetur në prova shkencore, duke ndihmuar mjekët dhe pacientët të marrin vendime të sigurta për shëndetin.", ["contactAddress"] = "Tiranë, Shqipëri", ["contactHours"] = "Për orarin e shërbimit, ju lutemi na kontaktoni.", ["contactPhone"] = "Shtoni numrin e telefonit nga paneli i administratorit.", ["contactEmail"] = "Shtoni email-in nga paneli i administratorit." };
    foreach (var pair in content) if (!await db.Content.AnyAsync(x => x.Key == pair.Key)) db.Content.Add(new SiteContent { Key = pair.Key, Value = pair.Value });
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
    }
    await db.SaveChangesAsync();
}
