using Microsoft.EntityFrameworkCore;

namespace AlfaDiagnostic;

public sealed class AlfaDb(DbContextOptions<AlfaDb> options) : DbContext(options)
{
    public DbSet<SiteContent> Content => Set<SiteContent>();
    public DbSet<ImageAsset> Images => Set<ImageAsset>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SiteContent>().HasKey(x => x.Key);
    }
}

public sealed class SiteContent { public string Key { get; set; } = string.Empty; public string Value { get; set; } = string.Empty; public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow; }
public sealed class ImageAsset { public Guid Id { get; set; } = Guid.NewGuid(); public string FileName { get; set; } = string.Empty; public string ContentType { get; set; } = string.Empty; public byte[] Bytes { get; set; } = []; public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow; }
public sealed class Article { public Guid Id { get; set; } = Guid.NewGuid(); public string Title { get; set; } = string.Empty; public string Excerpt { get; set; } = string.Empty; public string Body { get; set; } = string.Empty; public string Category { get; set; } = "Artikuj"; public Guid? ImageId { get; set; } public DateTimeOffset PublishedAt { get; set; } = DateTimeOffset.UtcNow; }
public sealed class ContactMessage { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public string Message { get; set; } = string.Empty; public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow; }
public sealed record LoginRequest(string Password);
public sealed record ValueRequest(string Value);
public sealed record ArticleRequest(string Title, string Excerpt, string? Body, string? Category, Guid? ImageId);
public sealed record ContactRequest(string Name, string Email, string Message);
