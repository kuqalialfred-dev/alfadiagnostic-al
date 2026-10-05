# Kopja për Host.al (Plesk, PHP dhe MariaDB)

Kjo degë ruan **të njëjtin frontend React, CSS dhe imazhe** si `main`. Ndryshon vetëm serverin: API-ja `.NET/PostgreSQL` është përshtatur në PHP 8.4/MariaDB 10.3, sepse paketa Host.al e treguar në Plesk ofron këto shërbime.

## Çfarë është përgatitur

- `node hostal/build.mjs` krijon `hostal/dist/httpdocs` dhe `hostal/dist/private`.
- `hostal/schema.sql` krijon tabelat e MariaDB.
- `node hostal/export-public.mjs https://alfadiagnostic.al` krijon `hostal/export/public-data.sql` nga API-ja publike e faqes ekzistuese. Ruhet përmbajtja e dukshme: tekstet, artikujt, temat, kategoritë dhe imazhet. Ri-ekzekutojeni para kalimit për të marrë ndryshimet e fundit.
- Fjalëkalimi i administratorit ruhet si `password_hash` në tabelën `admin_users`; nuk ruhet në tekst të thjeshtë. Përdoruesi dhe fjalëkalimi i MariaDB qëndrojnë në `private/config.php`, jashtë `httpdocs`.

## Hapat në Plesk

1. Krijoni një MariaDB me përdorues të veçantë. Zgjidhni **Allow local connections only**, jo hyrje nga çdo host. Shënoni emrin e plotë të DB-së dhe përdoruesit. Mos dërgoni fjalëkalimet në chat.
2. Në phpMyAdmin importoni `schema.sql` dhe pastaj `public-data.sql` (ose `public-data.sql.gz` nëse kompresimi pranohet). Eksporti aktual i të dhënave publike është rreth 38 MB, ose 19 MB i kompresuar, për shkak të imazheve. Nëse kufiri i importit ose `max_allowed_packet` nuk mjafton, kërkoni rritjen e kufirit te Host.al ose përdorni importin përmes SSH; mos e ndani eksportin në mënyrë manuale brenda një rreshti SQL të imazhit.
3. Në `hostal/dist/private`, kopjoni `config.example.php` si `config.php` dhe plotësoni kredencialet MariaDB. Vendosni një `setup_token` rastësor me të paktën 32 karaktere. Vendoseni dosjen `private` në të njëjtin nivel me `httpdocs`, jo brenda saj.
4. Ngarkoni **përmbajtjen** e `hostal/dist/httpdocs` në `httpdocs` të domain-it. Mbani strukturën `api`, `assets`, `images` dhe skedarin e fshehur `.htaccess`.
5. Në Plesk zgjidhni PHP 8.4 me `PDO MySQL` dhe `fileinfo`, dhe PHP handler të shërbyer nga Apache (p.sh. **FPM application served by Apache** ose **FastCGI application**). Mbani **Proxy mode** aktiv. Rregullat `.htaccess` për API dhe adresat e artikujve kërkojnë që kërkesat të kalojnë në Apache.
6. Aktivizoni certifikatën SSL/TLS dhe ridrejtimin HTTPS. Kontrolloni `https://DOMAIN/api/content`, `/api/articles`, `/api/knowledge`, `/api/catalog` dhe një adresë të brendshme si `/blog`.
7. Vetëm pasi HTTPS punon, hapni `/setup.php`, futni kodin njëpërdorimësh dhe vendosni një fjalëkalim administratori prej të paktën 12 karakteresh. Fshini menjëherë `httpdocs/setup.php` dhe `setup_token` nga `private/config.php`.
8. Testoni hyrjen në panelin e administratorit, ndryshimin e një teksti, imazhet, faqet e shërbimeve dhe artikujt në celular. Bëni eksportin e fundit të DB-së ekzistuese para ndërrimit të DNS. Pastaj drejtoni domain-in te IP-ja e treguar nga Host.al.

## Kufijtë e eksportit

Eksporti nga API-ja publike nuk përfshin fjalëkalimin e vjetër të administratorit, regjistrat e brendshëm ose të dhëna të papublikuara. `source_name` dhe `updated_at` të temave marrin vlera të reja gjatë importit; kjo nuk ndikon në pamjen publike. Nëse DB-ja ekzistuese ka të dhëna të tjera të rëndësishme, bëni edhe një kopje të plotë PostgreSQL nga Render para kalimit. Faqja aktuale në Render mbetet e paprekur deri në verifikimin e Host.al.

Formulari i kontaktit tani i ruan mesazhet në tabelën `contact_messages`. Nuk dërgon email automatikisht.
