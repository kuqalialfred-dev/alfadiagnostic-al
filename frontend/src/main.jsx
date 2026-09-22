import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, FlaskConical, LockKeyhole, Mail, MapPin, Menu, Microscope, Phone, Search, ShieldCheck, Upload, UsersRound, X } from 'lucide-react';
import './styles.css';
import './map.css';
import './knowledge.css';
import './logo.css';
import './contact.css';
import './article-detail.css';
import './editorial.css';
import './warm-design.css';
import './reference-home.css';
import { catalogTree } from './catalog.js';

const withoutHierarchyNumbers = value => value.split('\n').map(line => line.replace(/^\s*\d+(?:\.\d+)*\.?\s*[–—-]?\s*/, '')).join('\n');
const catalogKey = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const cleanCatalogLabel = value => withoutHierarchyNumbers(value || '').split(' · ').map(withoutHierarchyNumbers).join(' · ');
const pageParts = page => { const [field = '', ...rest] = (page.section || '').split(' · '); return { root: cleanCatalogLabel(page.category), field: cleanCatalogLabel(field), group: cleanCatalogLabel(rest.join(' · ')) }; };
const catalogUrl = (root, field, group) => `/sherbimet/kategori/${[root, field, group].filter(Boolean).map(catalogKey).join('/')}`;
const equivalent = (first, second) => {
  const a = catalogKey(first).replace(/infeksionet/g, 'infeksione').replace(/viruset/g, 'virale');
  const b = catalogKey(second).replace(/infeksionet/g, 'infeksione').replace(/viruset/g, 'virale');
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const words = a.split('-').filter(word => word.length > 3);
  return words.filter(word => b.includes(word)).length >= Math.min(2, words.length);
};
const belongsToRoot = (parts, root) => equivalent(parts.root, root);
const branchFor = (root, field) => catalogTree.find(item => item.title === root)?.branches.find(item => item.title === field);

function HeaderV4() {
  const [pages, setPages] = useState([]); const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false); const [servicesOpen, setServicesOpen] = useState(false);
  const [root, setRoot] = useState('Mikrobiologji'); const [field, setField] = useState('Mikologji'); const [group, setGroup] = useState('Infeksionet e lëkurës, thonjve dhe flokëve');
  useEffect(() => { api('/api/knowledge').then(setPages).catch(() => {}); }, []);
  const rootItem = catalogTree.find(item => item.title === root) || catalogTree[0];
  const fieldItem = rootItem.branches.find(item => item.title === field) || rootItem.branches[0];
  const groups = fieldItem.groups;
  const matches = pages.filter(page => { const parts = pageParts(page); return belongsToRoot(parts, root) && equivalent(parts.field, field) && (!parts.group || equivalent(parts.group, group)); });
  const chooseRoot = item => { setRoot(item.title); setField(item.branches[0].title); setGroup(item.branches[0].groups[0]); };
  const chooseField = item => { setField(item.title); setGroup(item.groups[0]); };
  return <header className="editorial-header"><a className="brand-lockup" href="/"><img src="/images/alfa-mark.png" alt="Logo Laboratori Alfa"/><span><b>Laboratori Alfa</b><small>Diagnostikë e saktë</small></span></a><button className="editorial-menu-button" aria-label="Hap menunë" onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X/> : <Menu/>}</button><nav className={mobileOpen ? 'editorial-nav open' : 'editorial-nav'}><a href="/rreth/laboratori-alfa">Laboratori Alfa</a><div className="nav-dropdown" onMouseEnter={() => setAboutOpen(true)} onMouseLeave={() => setAboutOpen(false)}><button onClick={() => setAboutOpen(open => !open)}>Rreth nesh <span>+</span></button>{aboutOpen && <div className="about-menu"><a href="/rreth/historia">Historia</a><a href="/rreth/misioni">Misioni</a><a href="/rreth/vlerat">Vlerat tona</a><a href="/rreth/ekipi">Ekipi</a></div>}</div><a href="/pse-alfa">Pse të zgjidhni Alfa?</a><div className="nav-dropdown services-trigger" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}><button onClick={() => setServicesOpen(open => !open)}>Shërbimet Laboratorike <span>+</span></button>{servicesOpen && <div className="mega-menu"><div className="mega-top"><span>01 — Katalogu</span><a href="/sherbimet">Shihni të gjitha shërbimet <ArrowRight size={15}/></a></div><div className="mega-columns"><div className="mega-column mega-root"><span>02 — Fusha</span>{catalogTree.map(item => <button className={item.title === root ? 'selected' : ''} onMouseEnter={() => chooseRoot(item)} onFocus={() => chooseRoot(item)} onClick={() => chooseRoot(item)} key={item.title}>{item.title}</button>)}</div><div className="mega-column"><span>03 — Disiplina</span>{rootItem.branches.map(item => <button className={item.title === field ? 'selected' : ''} onMouseEnter={() => chooseField(item)} onFocus={() => chooseField(item)} onClick={() => chooseField(item)} key={item.title}>{item.title}<ChevronRight size={15}/></button>)}</div><div className="mega-column"><span>04 — Nënkategoria</span>{groups.map(item => <a className={item === group ? 'selected' : ''} onMouseEnter={() => setGroup(item)} onFocus={() => setGroup(item)} href={catalogUrl(root, field, item)} key={item}>{item}<ChevronRight size={15}/></a>)}</div><div className="mega-column mega-pages"><span>05 — Temat</span>{matches.slice(0, 6).map(item => <a href={pageUrl(item.slug)} key={item.slug}>{item.title}<ChevronRight size={15}/></a>)}{!matches.length && <a href={catalogUrl(root, field, group)}>Hap kategorinë <ChevronRight size={15}/></a>}</div></div></div>}</div><a href="/kontakt">Kontakt</a></nav><a className="editorial-cta" href="/sherbimet">Katalogu <ArrowRight size={16}/></a></header>;
}

function HeaderV5() {
  const [pages, setPages] = useState([]); const [mobileOpen, setMobileOpen] = useState(false); const [aboutOpen, setAboutOpen] = useState(false); const [servicesOpen, setServicesOpen] = useState(false);
  const [root, setRoot] = useState('Infeksionet'); const [field, setField] = useState('Mikologji');
  useEffect(() => { api('/api/knowledge').then(setPages).catch(() => {}); }, []);
  const rootItem = catalogTree.find(item => item.title === root) || catalogTree[0];
  const topics = pages.filter(page => { const parts = pageParts(page); return belongsToRoot(parts, root) && equivalent(parts.field, field); });
  const descriptions = { Mikologji: 'Diagnostikimi i infeksioneve kërpudhore të lëkurës, thonjve dhe mukozave.', Bakteriologji: 'Zbulimi dhe identifikimi i baktereve që shkaktojnë infeksione.', Parazitologji: 'Vlerësimi laboratorik i parazitëve që mund të ndikojnë shëndetin.', Virologji: 'Analiza për viruset dhe monitorimi i infeksioneve virale.', 'Analiza Klinike': 'Tregues laboratorikë bazë për vlerësimin klinik.', Biokimi: 'Analiza për funksione dhe tregues biokimikë.', Hormonet: 'Vlerësimi i funksionit hormonal sipas kërkesës së mjekut.', Imunologjia: 'Analiza imunologjike dhe markues specifikë.' };
  const selectRoot = item => { setRoot(item.title); setField(item.branches[0].title); };
  return <header className="warm-header"><a className="warm-brand" href="/"><img src="/images/alfa-mark.png" alt="Logo Laboratori Alfa"/><span><small>Laboratori</small><b>Alfa</b><em>Diagnostikë e saktë, kujdes i plotë.</em></span></a><button className="warm-menu-button" aria-label="Hap menunë" onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X/> : <Menu/>}</button><nav className={mobileOpen ? 'warm-nav open' : 'warm-nav'}><a href="/rreth/laboratori-alfa">Laboratori Alfa</a><div className="warm-dropdown" onMouseEnter={() => setAboutOpen(true)} onMouseLeave={() => setAboutOpen(false)}><button onClick={() => setAboutOpen(open => !open)}>Rreth nesh <span>+</span></button>{aboutOpen && <div className="warm-about-menu"><a href="/rreth/historia">Historia</a><a href="/rreth/misioni">Misioni</a><a href="/rreth/vlerat">Vlerat tona</a><a href="/rreth/ekipi">Ekipi</a></div>}</div><a href="/pse-alfa">Pse të zgjidhni Alfa?</a><div className="warm-dropdown warm-services" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}><button onClick={() => setServicesOpen(open => !open)}>Shërbimet Laboratorike <span>+</span></button>{servicesOpen && <div className="warm-mega"><div className="warm-tabs">{catalogTree.map(item => <button className={item.title === root ? 'selected' : ''} onMouseEnter={() => selectRoot(item)} onFocus={() => selectRoot(item)} onClick={() => selectRoot(item)} key={item.title}>{item.title}</button>)}<a href="/sherbimet">Mbyll <X size={17}/></a></div><div className="warm-mega-content"><div className="warm-discipline-cards">{rootItem.branches.map((item, index) => <a className={item.title === field ? 'selected' : ''} href={catalogUrl(root, item.title)} onMouseEnter={() => setField(item.title)} onFocus={() => setField(item.title)} key={item.title}><i>{String.fromCharCode(65 + index)}</i><strong>{item.title}</strong><p>{descriptions[item.title]}</p><ArrowRight size={18}/></a>)}</div><aside className="warm-topic-panel"><p>{root} <ChevronRight size={14}/> {field}</p><strong>Temat e disponueshme</strong>{topics.slice(0, 5).map(item => <a href={pageUrl(item.slug)} key={item.slug}><span>{item.title}</span><ArrowRight size={15}/></a>)}{!topics.length && <a href={catalogUrl(root, field)}><span>Hap nënkategoritë</span><ArrowRight size={15}/></a>}</aside></div></div>}</div><a href="/kontakt">Kontakt</a></nav><a className="warm-cta" href="/kontakt">Kontakto laboratorin</a></header>;
}

function HomeV5({ content, articles, setArticles, admin, setAdmin, sent, onContact, setContent }) { return <><HeaderV5/><main><section className="warm-hero"><div className="warm-hero-copy"><p>Laboratori Alfa · Tiranë</p><h1>Saktësi në çdo analizë,<br/><em>kujdes në çdo hap.</em></h1><span></span><p className="warm-description">Teknologji moderne, standarde bashkëkohore dhe rezultate që ju japin siguri.</p><div><a className="warm-button" href="/sherbimet">Shiko shërbimet <ArrowRight size={16}/></a><a className="warm-secondary" href="/kontakt">Na kontaktoni</a></div></div><div className="warm-still-life"><div className="warm-sun"></div><div className="warm-plinth"></div><div className="warm-dish"></div><div className="warm-tube-art"><img src="/images/alfa-mark.png" alt=""/><b>Laboratori Alfa</b></div><div className="warm-moss"></div></div></section><section className="warm-service-intro"><div><p>Mikrobiologji</p><h2>Mikologji, Bakteriologji, Parazitologji dhe Virologji.</h2><a href={catalogUrl('Mikrobiologji')}>Eksploro mikrobiologjinë <ArrowRight size={16}/></a></div><div><p>Analizat</p><h2>Analiza klinike, biokimi, hormone dhe imunologji.</h2><a href={catalogUrl('Analizat')}>Eksploro analizat <ArrowRight size={16}/></a></div></section><section className="warm-about"><p>Laboratori Alfa</p><h2>Një proces laboratorik i bërë <em>me kujdes.</em></h2><span>{content.about}</span></section><ArticlesV2 articles={articles}/><ContactV2 content={content} sent={sent} onSubmit={onContact}/></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p><button onClick={() => setAdmin(true)}>Admin</button></footer>{admin && <Admin onClose={() => setAdmin(false)} content={content} setContent={setContent} articles={articles} setArticles={setArticles}/>}</>;
}

function LogoV4() { return <a className="footer-brand" href="/"><img src="/images/alfa-mark.png" alt="Logo Laboratori Alfa"/><span>Laboratori Alfa</span></a>; }

function CatalogLanding({ pages }) { return <><HeaderV4/><main className="catalog-landing"><p className="catalog-index">Katalogu / Shërbimet Laboratorike</p><h1>Zgjidhni fushën që <em>kërkoni.</em></h1><p className="catalog-intro">Katalogu organizohet sipas fushës, disiplinës dhe nënkategorisë. Çdo temë hap informacionin e plotë përkatës.</p><div className="catalog-root-grid">{catalogTree.map((root, index) => <a className="catalog-root-card" href={catalogUrl(root.title)} key={root.title}><span>0{index + 1}</span><h2>{root.title}</h2><p>{root.branches.map(branch => branch.title).join(' · ')}</p><ArrowRight size={22}/></a>)}</div></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer></>; }

function CatalogCategoryPage({ pages, rootKey, fieldKey, groupKey }) {
  const root = catalogTree.find(item => catalogKey(item.title) === rootKey); const field = root?.branches.find(item => catalogKey(item.title) === fieldKey); const group = field?.groups.find(item => catalogKey(item) === groupKey);
  if (!root) return <CatalogLanding pages={pages}/>;
  const visible = pages.filter(page => { const parts = pageParts(page); return belongsToRoot(parts, root.title) && (!field || equivalent(parts.field, field.title)) && (!group || !parts.group || equivalent(parts.group, group)); });
  const options = !field ? root.branches.map(item => ({ title: item.title, href: catalogUrl(root.title, item.title) })) : !group ? field.groups.map(item => ({ title: item, href: catalogUrl(root.title, field.title, item) })) : [];
  const trail = [root.title, field?.title, group].filter(Boolean);
  return <><HeaderV4/><main className="catalog-page"><a className="back-link" href={field ? catalogUrl(root.title) : '/sherbimet'}><ArrowLeft size={17}/> {field ? root.title : 'Katalogu i shërbimeve'}</a><p className="catalog-index">{trail.join(' / ')}</p><h1>{group || field?.title || root.title}</h1>{options.length > 0 && <div className="catalog-branch-grid">{options.map((item, index) => <a href={item.href} key={item.title}><span>0{index + 1}</span><strong>{item.title}</strong><ArrowRight size={17}/></a>)}</div>}<section className="catalog-topics"><div><p className="catalog-index">Temat e disponueshme</p><h2>{visible.length ? 'Zgjidhni temën për të lexuar më shumë.' : 'Kjo kategori po organizohet.'}</h2></div><div className="catalog-topic-list">{visible.map(page => <a href={pageUrl(page.slug)} key={page.slug}><span>{page.title}</span><ChevronRight size={17}/></a>)}{!visible.length && <p>Materialet e publikuara do të shfaqen këtu sapo të përfundojë organizimi i kësaj nënkategorie.</p>}</div></section></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer></>;
}

function InformationPage({ page, content }) {
  const details = {
    'laboratori-alfa': ['Laboratori Alfa', 'Laboratori Alfa u themelua në Tiranë në tetor 2008 nga Dr. Najada Gjylameti. Kujdesi për pacientin, saktësia laboratorike dhe komunikimi i qartë janë në qendër të punës sonë.'],
    historia: ['Historia', content.history || content.about],
    misioni: ['Misioni', content.mission || fallback.mission],
    vlerat: ['Vlerat tona', 'Saktësia, përgjegjësia profesionale, konfidencialiteti dhe respekti për pacientin udhëheqin çdo proces në Laboratorin Alfa.'],
    ekipi: ['Ekipi', 'Ekipi i Laboratorit Alfa bashkon përvojën laboratorike me kujdesin e nevojshëm për çdo pacient dhe çdo mostër.'],
    'pse-alfa': ['Pse të zgjidhni Laboratorin Alfa?', 'Ne kombinojmë përvojën profesionale, metodat bashkëkohore dhe kujdesin për detajet për të mbështetur një diagnostikim laboratorik të besueshëm.']
  };
  const [title, copy] = details[page] || details['laboratori-alfa'];
  return <><HeaderV4/><main className="information-page"><p className="catalog-index">Laboratori Alfa / Informacion</p><h1>{title}</h1><article><p>{copy}</p><a className="editorial-button" href="/sherbimet">Eksploro shërbimet <ArrowRight size={16}/></a></article></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer></>;
}

function HomeV6({ content, articles, setArticles, admin, setAdmin, sent, onContact, setContent }) {
  const services = [
    ['Mikrobiologjia', 'Analiza për identifikimin e baktereve, viruseve, parazitëve dhe kërpudhave.', Microscope, '/images/service-microbiology-card.png', 'Infeksionet'],
    ['Analizat klinike-biokimike', 'Analiza laboratorike të gjakut, urinës dhe biokimike për një vlerësim të plotë.', FlaskConical, '/images/service-clinical-card.png', 'Analizat', 'Analiza Klinike'],
    ['Hormonet', 'Teste hormonale për diagnostikim dhe monitorim të çrregullimeve endokrine.', UsersRound, '/images/service-hormones-card.png', 'Analizat', 'Hormonet'],
    ['Imunologjia', 'Analiza imunologjike për sëmundje autoimune, alergji dhe infeksione.', ShieldCheck, '/images/service-immunology-card.png', 'Analizat', 'Imunologjia']
  ];
  const features = [
    ['Saktësi maksimale', 'Rezultate të sakta dhe të besueshme', ShieldCheck],
    ['Teknologji moderne', 'Pajisje të avancuara për çdo analizë', FlaskConical],
    ['Staf i kualifikuar', 'Ekspertizë dhe përvojë shumëvjeçare', UsersRound],
    ['Rezultate të shpejta', 'Koha juaj është e rëndësishme për ne', Clock3]
  ];
  const reasons = [['Cilësi e garantuar', 'Standarde ndërkombëtare të cilësisë në çdo hap.', ShieldCheck], ['Konfidencialitet', 'Të dhënat tuaja të sigurta dhe të mbrojtura.', LockKeyhole], ['Çmim i arsyeshëm', 'Cilësi e lartë me çmime konkurruese.', UsersRound], ['Shërbim i personalizuar', 'Kujdes i veçantë për çdo pacient.', CalendarDays]];
  return <>
    <HeaderV6/>
    <main className="reference-home">
      <section className="reference-hero">
        <img className="reference-hero-image" src="/images/hero-laboratory-approved.png" alt="Pajisje laboratorike, mikroskop dhe mostra gjaku"/>
        <div className="reference-hero-overlay"></div>
        <div className="reference-hero-copy">
          <h1>Përkujdesje e saktë,<br/><strong>rezultate të besueshme,</strong><br/>shëndet më i mirë.</h1>
          <p>Analiza të sakta dhe të besueshme me teknologjinë më të avancuar<br className="desktop-break"/> dhe stafin më të kualifikuar, për ju dhe familjen tuaj.</p>
          <div className="reference-actions"><a className="reference-primary" href="/sherbimet">Shërbimet tona <ArrowRight size={18}/></a><a className="reference-secondary" href="/kontakt">Na kontaktoni</a></div>
        </div>
        <aside className="reference-hero-note"><strong>Saktësi<br/>në çdo analizë</strong><i></i><span>Teknologji moderne<br/>për rezultate të sigurta.</span></aside>
      </section>
      <section className="reference-features">{features.map(([title, text, Icon]) => <article key={title}><Icon/><div><h2>{title}</h2><p>{text}</p></div></article>)}</section>
      <section className="reference-services">
        <div className="reference-section-heading"><div><p>Shërbimet tona</p><h2>Analiza laboratorike për çdo nevojë tuajën</h2></div><a href="/sherbimet">Shiko të gjitha shërbimet <ArrowRight size={18}/></a></div>
        <div className="reference-service-grid">{services.map(([title, text, Icon, image, root, field], index) => <a className="reference-service-card" href={catalogUrl(root, field)} key={title}><div className="reference-card-content"><Icon className="reference-card-icon"/><h3>{title}</h3><p>{text}</p><span>Më shumë <ArrowRight size={17}/></span></div><div className={`reference-card-image reference-card-image-${index}`}><img src={image} alt=""/></div></a>)}</div>
      </section>
      <section className="reference-reasons"><div className="reference-reasons-intro"><h2>Pse të zgjidhni<br/>Qendrën Diagnostike Alfa?</h2><p>{content.about}</p></div>{reasons.map(([title, text, Icon]) => <article key={title}><Icon/><h3>{title}</h3><p>{text}</p></article>)}</section>
      <ArticlesV2 articles={articles}/>
      <ContactV2 content={content} sent={sent} onSubmit={onContact}/>
    </main>
    <footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer>
    {admin && <Admin onClose={() => setAdmin(false)} content={content} setContent={setContent} articles={articles} setArticles={setArticles}/>}</>;
}

function HomeV4({ content, pages, articles, setArticles, admin, setAdmin, sent, onContact, setContent }) { return <><HeaderV4/><main><section className="editorial-hero"><div><p className="catalog-index">Laboratori Alfa / Tiranë</p><h1>Diagnostikë e saktë.<br/><em>Përgjigje që kujdesen.</em></h1><p>Rezultate laboratorike të besueshme, të mbështetura në përvojë profesionale dhe vëmendje për çdo hap.</p><div><a className="editorial-button" href="/sherbimet">Shiko katalogun <ArrowRight size={16}/></a><a className="editorial-text-link" href="/kontakt">Na kontaktoni</a></div></div><span className="hero-alpha">α</span></section><section className="editorial-index"><p className="catalog-index">Indeksi i shërbimeve</p><a href={catalogUrl('Infeksionet')}><strong>Infeksionet</strong><span>Mikologji · Bakteriologji · Parazitologji · Virologji</span><ArrowRight size={18}/></a><a href={catalogUrl('Analizat')}><strong>Analizat</strong><span>Analiza Klinike · Biokimi · Hormonet · Imunologjia</span><ArrowRight size={18}/></a></section><section className="editorial-about"><div><p className="catalog-index">Laboratori Alfa</p><h2>Një proces i mirë fillon me <em>qartësi.</em></h2></div><p>{content.about}</p></section><ArticlesV2 articles={articles}/><ContactV2 content={content} sent={sent} onSubmit={onContact}/></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p><button onClick={() => setAdmin(true)}>Admin</button></footer>{admin && <Admin onClose={() => setAdmin(false)} content={content} setContent={setContent} articles={articles} setArticles={setArticles}/>}</>;
}

function ContactPage({ content, sent, onContact }) { return <><HeaderV4/><main className="contact-page"><p className="catalog-index">Laboratori Alfa / Kontakt</p><h1>Jemi këtu për t’ju ndihmuar.</h1><ContactV2 content={content} sent={sent} onSubmit={onContact}/></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer></>; }

function WarmServiceMega({ pages, root, field, group, setRoot, setField, setGroup }) {
  const rootItem = catalogTree.find(item => item.title === root) || catalogTree[0]; const fieldItem = rootItem.branches.find(item => item.title === field) || rootItem.branches[0];
  const topics = pages.filter(page => { const parts = pageParts(page); return belongsToRoot(parts, root) && equivalent(parts.field, field) && (!parts.group || equivalent(parts.group, group)); });
  const selectRoot = item => { setRoot(item.title); setField(item.branches[0].title); setGroup(item.branches[0].groups[0]); }; const selectField = item => { setField(item.title); setGroup(item.groups[0]); };
  return <div className="warm-mega"><div className="warm-tabs">{catalogTree.map(item => <button className={item.title === root ? 'selected' : ''} onMouseEnter={() => selectRoot(item)} onFocus={() => selectRoot(item)} onClick={() => selectRoot(item)} key={item.title}>{item.title}</button>)}<a href="/sherbimet">Shih katalogun <ArrowRight size={16}/></a></div><div className="warm-mega-content"><div className="warm-discipline-cards">{rootItem.branches.map((item, index) => <button className={item.title === field ? 'selected' : ''} onMouseEnter={() => selectField(item)} onFocus={() => selectField(item)} onClick={() => selectField(item)} key={item.title}><i>{String.fromCharCode(65 + index)}</i><strong>{item.title}</strong><p>Hap nënkategoritë dhe temat përkatëse.</p><ArrowRight size={18}/></button>)}</div><aside className="warm-topic-panel"><p>{root} <ChevronRight size={14}/> {field}</p><div className="warm-group-tabs">{fieldItem.groups.map(item => <button className={item === group ? 'selected' : ''} onMouseEnter={() => setGroup(item)} onFocus={() => setGroup(item)} onClick={() => setGroup(item)} key={item}>{item}</button>)}</div><strong>{group}</strong>{topics.slice(0, 7).map(item => <a href={pageUrl(item.slug)} key={item.slug}><span>{item.title}</span><ArrowRight size={15}/></a>)}{!topics.length && <a href={catalogUrl(root, field, group)}><span>Hap faqen e nënkategorisë</span><ArrowRight size={15}/></a>}</aside></div></div>;
}

function HeaderV6() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const closeMenus = () => { setMobileOpen(false); setAboutOpen(false); setServicesOpen(false); };
  return <header className="reference-header">
    <a className="reference-brand" href="/" onClick={closeMenus}><img src="/images/alfa-mark.png" alt="Logo Qendra Diagnostike Alfa"/><span>QENDRA<br/>DIAGNOSTIKE ALFA</span></a>
    <button className="reference-menu-button" aria-label="Hap menunë" onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X/> : <Menu/>}</button>
    <nav className={mobileOpen ? 'reference-nav open' : 'reference-nav'}>
      <a className={window.location.pathname === '/' ? 'active' : ''} href="/" onClick={closeMenus}>Kreu</a>
      <div className="reference-dropdown"><button aria-expanded={aboutOpen} onClick={() => { setAboutOpen(open => !open); setServicesOpen(false); }}>Rreth nesh <ChevronDown size={15}/></button>{aboutOpen && <div className="reference-dropdown-menu"><a href="/rreth/historia" onClick={closeMenus}>Historia</a><a href="/rreth/misioni" onClick={closeMenus}>Misioni</a><a href="/rreth/vlerat" onClick={closeMenus}>Vlerat tona</a><a href="/rreth/ekipi" onClick={closeMenus}>Ekipi</a></div>}</div>
      <a href="/pse-alfa" onClick={closeMenus}>Pse të zgjidhni Alfa?</a>
      <div className="reference-dropdown"><button aria-expanded={servicesOpen} onClick={() => { setServicesOpen(open => !open); setAboutOpen(false); }}>Shërbimet <ChevronDown size={15}/></button>{servicesOpen && <div className="reference-dropdown-menu services-menu"><a href={catalogUrl('Infeksionet')} onClick={closeMenus}>Mikrobiologjia</a><a href={catalogUrl('Analizat', 'Analiza Klinike')} onClick={closeMenus}>Analizat klinike-biokimike</a><a href={catalogUrl('Analizat', 'Hormonet')} onClick={closeMenus}>Hormonet</a><a href={catalogUrl('Analizat', 'Imunologjia')} onClick={closeMenus}>Imunologjia</a><a className="all-services-link" href="/sherbimet" onClick={closeMenus}>Shiko të gjitha <ArrowRight size={15}/></a></div>}</div>
      <a href="/#artikuj" onClick={closeMenus}>Blog</a><a href="/kontakt" onClick={closeMenus}>Kontaktet</a>
    </nav>
    <div className="reference-header-actions"><a className="reference-phone" href="tel:+355688546291"><Phone size={17}/> 068 854 6291</a><a className="reference-book" href="/kontakt"><CalendarDays size={17}/> Rezervo analizën</a></div>
  </header>;
}

function HomeV6Legacy({ content, articles, setArticles, admin, setAdmin, sent, onContact, setContent }) { return <><HeaderV6/><main><section className="warm-hero"><div className="warm-hero-copy"><p>Laboratori Alfa · Tiranë</p><h1>Saktësi në çdo analizë,<br/><em>kujdes në çdo hap.</em></h1><span></span><p className="warm-description">Teknologji moderne, standarde bashkëkohore dhe rezultate që ju japin siguri.</p><div><a className="warm-button" href="/sherbimet">Shiko shërbimet <ArrowRight size={16}/></a><a className="warm-secondary" href="/kontakt">Na kontaktoni</a></div></div><div className="warm-still-life"><div className="warm-sun"></div><div className="warm-plinth"></div><div className="warm-dish"></div><div className="warm-tube-art"><img src="/images/alfa-mark.png" alt=""/><b>Laboratori Alfa</b></div><div className="warm-moss"></div></div></section><section className="warm-service-intro"><div><p>Infeksionet</p><h2>Mikologji, Bakteriologji, Parazitologji dhe Virologji.</h2><a href={catalogUrl('Infeksionet')}>Eksploro infeksionet <ArrowRight size={16}/></a></div><div><p>Analizat</p><h2>Analiza klinike, biokimi, hormone dhe imunologji.</h2><a href={catalogUrl('Analizat')}>Eksploro analizat <ArrowRight size={16}/></a></div></section><section className="warm-about"><p>Laboratori Alfa</p><h2>Një proces laboratorik i bërë <em>me kujdes.</em></h2><span>{content.about}</span></section><ArticlesV2 articles={articles}/><ContactV2 content={content} sent={sent} onSubmit={onContact}/></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p><button onClick={() => setAdmin(true)}>Admin</button></footer>{admin && <Admin onClose={() => setAdmin(false)} content={content} setContent={setContent} articles={articles} setArticles={setArticles}/>}</>; }

function AppV4() {
  const [content, setContent] = useState(fallback); const [pages, setPages] = useState([]); const [articles, setArticles] = useState([]); const [admin, setAdmin] = useState(false); const [sent, setSent] = useState(false);
  useEffect(() => { api('/api/content').then(data => setContent(old => ({ ...old, ...data }))).catch(() => {}); api('/api/knowledge').then(setPages).catch(() => {}); api('/api/articles').then(setArticles).catch(() => {}); }, []);
  const contact = async event => { event.preventDefault(); try { await api('/api/contact', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); setSent(true); event.target.reset(); } catch {} };
  const segments = window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments[0] === 'artikuj' && segments[1]) return <ArticlePage id={segments[1]}/>;
  if (segments[0] === 'rreth') return <InformationPage page={segments[1]} content={content}/>;
  if (segments[0] === 'pse-alfa') return <InformationPage page="pse-alfa" content={content}/>;
  if (segments[0] === 'kontakt') return <ContactPage content={content} sent={sent} onContact={contact}/>;
  if (segments[0] === 'admin') return <Admin onClose={() => window.location.assign('/')} content={content} setContent={setContent} articles={articles} setArticles={setArticles}/>;
  if (segments[0] === 'sherbimet' && segments[1] === 'kategori') return <CatalogCategoryPage pages={pages} rootKey={segments[2]} fieldKey={segments[3]} groupKey={segments[4]}/>;
  if (segments[0] === 'sherbimet' && segments[1]) return <KnowledgePage slug={segments[1]}/>;
  if (segments[0] === 'sherbimet') return <CatalogLanding pages={pages}/>;
  return <HomeV4 content={content} pages={pages} articles={articles} setArticles={setArticles} admin={admin} setAdmin={setAdmin} sent={sent} onContact={contact} setContent={setContent}/>;
}

HeaderV4 = HeaderV6;
HomeV4 = HomeV6;
Header = HeaderV6;
Logo = LogoV4;
App = AppV4;

function ArticlesV2({ articles }) {
  return <section className="articles" id="artikuj">
    <div className="section-heading"><div><p className="eyebrow">Artikuj & udhëzime</p><h2>Njohuri që e bëjnë kujdesin <em>më të qartë.</em></h2></div><p>Materiale të përzgjedhura për pacientët dhe profesionistët e shëndetit.</p></div>
    <div className="article-grid">{articles.slice(0, 6).map((article, i) => <a className="article-card article-card-link" href={`/artikuj/${article.id}`} key={article.id}>
      <div className={`article-image image-${i % 3}`}>{article.imageId ? <img src={`/api/images/${article.imageId}`} alt=""/> : <FlaskConical/>}<span>{article.category}</span></div>
      <div><h3>{article.title}</h3><p>{article.excerpt}</p><span className="article-read-more">Lexo artikullin <ArrowRight size={15}/></span></div>
    </a>)}</div>
  </section>;
}

function ArticlePage({ id }) {
  const [article, setArticle] = useState(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => { api(`/api/articles/${id}`).then(setArticle).catch(() => setArticle(false)); }, [id]);
  if (article === null) return <><Header menu={menu} setMenu={setMenu}/><main className="loading-page">Duke hapur artikullin…</main></>;
  if (!article) return <><Header menu={menu} setMenu={setMenu}/><main className="loading-page"><h1>Artikulli nuk u gjet.</h1><a className="button primary" href="/#artikuj">Kthehu te artikujt</a></main></>;
  const blocks = (article.body || article.excerpt).split(/\n\n+/).filter(Boolean);
  return <><Header menu={menu} setMenu={setMenu}/><main className="article-page">
    <a className="back-link" href="/#artikuj"><ArrowLeft size={17}/> Artikuj & udhëzime</a>
    <div className="article-detail-grid"><article className="article-detail-content"><p className="eyebrow">{article.category}</p><h1>{article.title}</h1><p className="article-lead">{article.excerpt}</p><div className="article-detail-image">{article.imageId ? <img src={`/api/images/${article.imageId}`} alt={article.title}/> : <img src="/images/og-editorial.png" alt="Laboratori Alfa"/>}</div><div className="article-prose">{blocks.map((block, index) => <p className={/^[🧪📋📌❓]/u.test(block) ? 'article-subheading' : ''} key={index}>{block}</p>)}</div><div className="medical-note"><ShieldCheck size={19}/><span>Informacioni është orientues dhe nuk zëvendëson këshillën e mjekut. Për analiza ose përgatitje specifike, kontaktoni Laboratorin Alfa.</span></div></article><aside className="article-detail-aside"><p className="eyebrow">Laboratori Alfa</p><h2>Keni nevojë për udhëzim?</h2><p>Kontaktoni laboratorin për informacion mbi përgatitjen dhe marrjen e mostrës.</p><a className="button primary" href="/kontakt">Na kontaktoni <ArrowRight size={16}/></a></aside></div>
  </main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer></>;
}

function AppV2() {
  const [content, setContent] = useState(fallback); const [pages, setPages] = useState([]); const [articles, setArticles] = useState([]); const [admin, setAdmin] = useState(false); const [sent, setSent] = useState(false);
  useEffect(() => { api('/api/content').then(data => setContent(old => ({ ...old, ...data }))).catch(() => {}); api('/api/knowledge').then(setPages).catch(() => {}); api('/api/articles').then(setArticles).catch(() => {}); }, []);
  const contact = async e => { e.preventDefault(); try { await api('/api/contact', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) }); setSent(true); e.target.reset(); } catch {} };
  const path = window.location.pathname; const articleId = path.startsWith('/artikuj/') ? decodeURIComponent(path.slice('/artikuj/'.length)) : ''; const slug = path.startsWith('/sherbimet/') ? decodeURIComponent(path.slice('/sherbimet/'.length)) : '';
  return articleId ? <ArticlePage id={articleId}/> : slug ? <KnowledgePage slug={slug}/> : <Home content={content} pages={pages} articles={articles} setArticles={setArticles} admin={admin} setAdmin={setAdmin} sent={sent} onContact={contact}/>;
}

Articles = ArticlesV2;

function ContactV2({ content, sent, onSubmit }) {
  return <section className="contact" id="kontakt">
    <div className="contact-copy">
      <p className="eyebrow">Kontakt</p>
      <h2>Jemi këtu për t’ju <em>ndihmuar.</em></h2>
      <p>Për pyetje mbi shërbimet laboratorike ose për informacion rreth përgatitjes për analiza, shkruani ose kontaktoni laboratorin.</p>
      <div className="contact-list">
        <p><MapPin/> <span><strong>Adresa</strong>{content.contactAddress}</span></p>
        <p><Clock3/> <span><strong>Orari</strong><span className="contact-value">{content.contactHours}</span></span></p>
        <p><Phone/> <span><strong>Telefoni</strong><span className="phone-links"><a href="tel:+355682206300">068 220 6300</a><a href="tel:+355688546291">068 854 6291</a></span></span></p>
        <p><Mail/> <span><strong>Email</strong>{content.contactEmail}</span></p>
      </div>
      <div className="contact-actions">
        <a className="button whatsapp-button" href="https://wa.me/355688546291" target="_blank" rel="noreferrer">Chat në WhatsApp <ArrowRight size={16}/></a>
      </div>
      <div className="map-card">
        <div className="map-card-head"><MapPin size={18}/><span><strong>Gjeni Laboratorin Alfa</strong><small>Hapni hartën ose nisni drejtimin menjëherë.</small></span></div>
        <iframe title="Harta e Laboratorit Alfa" loading="lazy" src={`https://www.google.com/maps?q=${alfaMap.coordinates}&z=16&output=embed`}/>
        <a className="button map-directions" href={alfaMap.directions} target="_blank" rel="noreferrer">Merr drejtimin në Google Maps <ArrowRight size={16}/></a>
      </div>
    </div>
    <form className="contact-form" onSubmit={onSubmit}>
      <label>Emri<input required name="name" placeholder="Emri juaj"/></label>
      <label>Email<input required type="email" name="email" placeholder="email@shembull.al"/></label>
      <label>Mesazhi<textarea required name="message" placeholder="Si mund t’ju ndihmojmë?"/></label>
      <button className="button primary">Dërgo mesazhin <ArrowRight size={16}/></button>
      {sent && <small>Faleminderit. Mesazhi u ruajt me sukses.</small>}
    </form>
  </section>;
}

Contact = ContactV2;

const fallback = {
  about: 'Laboratori Alfa ofron diagnostikim laboratorik të besueshëm, të mbështetur në përvojë profesionale dhe kujdes për pacientin.',
  mission: 'Diagnostikim laboratorik i saktë, i besueshëm dhe i mbështetur në prova shkencore.',
  contactAddress: 'Tiranë, Shqipëri', contactHours: 'Për orarin e shërbimit, ju lutemi na kontaktoni.', contactPhone: 'Shtoni numrin e telefonit nga paneli i administratorit.', contactEmail: 'Shtoni email-in nga paneli i administratorit.'
};
fallback.contactHours = 'E hënë – e premte: 08:00 – 17:00\nE shtunë: 08:00 – 13:00';
fallback.contactPhone = '068 220 6300\n068 854 6291';
fallback.contactAddress = 'Rruga e Dibrës, në kryqëzim me Rrugën Riza Cerova, Pallati 132, Kati II, Tiranë';
const alfaMap = { coordinates: '41.3390853,19.8277466', directions: 'https://www.google.com/maps/dir/?api=1&destination=41.3390853%2C19.8277466&travelmode=driving' };
const api = async (url, options = {}) => { const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Diçka shkoi keq.'); return response.status === 204 ? null : response.json(); };
const pageUrl = slug => `/sherbimet/${encodeURIComponent(slug)}`;

// The catalog is populated after the root page loads. When browser history
// returns to /#sherbimet, wait for that async content, then restore its section.
if (typeof window !== 'undefined' && window.location.hash) {
  const restoreHashTarget = () => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return false;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 94, behavior: 'auto' });
    return true;
  };
  const watchForHashTarget = () => {
    if (restoreHashTarget()) return;
    const observer = new MutationObserver(() => {
      if (restoreHashTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  };
  document.readyState === 'loading'
    ? window.addEventListener('DOMContentLoaded', watchForHashTarget, { once: true })
    : watchForHashTarget();
}

function Logo() { return <a className="logo" href="/"><span>α</span><b>Laboratori<br/>Alfa</b></a>; }

function Header({ menu, setMenu }) {
  return <header><Logo/><button className="menu-button" aria-label="Hap menunë" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button><nav className={menu ? 'open' : ''}><a href="/#rreth">Rreth nesh</a><a href="/#pse-alfa">Pse Alfa?</a><a href="/#sherbimet">Shërbimet</a><a href="/#artikuj">Artikuj</a><a href="/#kontakt">Kontakt</a></nav><a className="header-cta" href="/#sherbimet">Katalogu i analizave <ArrowRight size={16}/></a></header>;
}

function PageGrid({ pages }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => pages.filter(page => `${page.title} ${page.category} ${page.section}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [pages, query]);
  const groups = useMemo(() => [...new Set(visible.map(page => page.section))], [visible]);
  return <section className="service-section" id="sherbimet"><div className="section-heading"><div><p className="eyebrow">Katalogu i shërbimeve</p><h2>Gjeni analizën ose infeksionin që po <em>kërkoni.</em></h2></div><p>Çdo temë hap një faqe të veçantë me përgatitjen e mostrës dhe informacionin laboratorik të përgatitur nga Laboratori Alfa.</p></div><label className="search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kërko Onikomikoza, HBV, TSH…"/></label><div className="knowledge-grid">{groups.map(section => <article className="knowledge-group" key={section}><div className="knowledge-group-title"><BookOpen size={17}/><div><span>{visible.find(x => x.section === section)?.category}</span><h3>{section}</h3></div></div><div>{visible.filter(x => x.section === section).map(page => <a className="knowledge-link" href={pageUrl(page.slug)} key={page.slug}><span>{page.title}</span><ChevronRight size={16}/></a>)}</div></article>)}</div>{!visible.length && <p className="empty-state">Nuk u gjet asnjë rezultat për këtë kërkim.</p>}</section>;
}

function Articles({ articles }) { return <section className="articles" id="artikuj"><div className="section-heading"><div><p className="eyebrow">Artikuj & udhëzime</p><h2>Njohuri që e bëjnë kujdesin <em>më të qartë.</em></h2></div><p>Materiale të përzgjedhura për pacientët dhe profesionistët e shëndetit.</p></div><div className="article-grid">{articles.slice(0,6).map((article, i) => <article className="article-card" key={article.id}><div className={`article-image image-${i % 3}`}>{article.imageId ? <img src={`/api/images/${article.imageId}`} alt=""/> : <FlaskConical/>}<span>{article.category}</span></div><div><h3>{article.title}</h3><p>{article.excerpt}</p>{article.body && <p className="article-body-preview">{article.body.slice(0, 150)}…</p>}</div></article>)}</div></section>; }

function Contact({ content, sent, onSubmit }) { return <section className="contact" id="kontakt"><div className="contact-copy"><p className="eyebrow">Kontakt</p><h2>Jemi këtu për t’ju <em>ndihmuar.</em></h2><p>Për pyetje mbi shërbimet laboratorike ose për informacion rreth përgatitjes për analiza, shkruani ose kontaktoni laboratorin.</p><div className="contact-list"><p><MapPin/> <span><strong>Adresa</strong>{content.contactAddress}</span></p><p><Clock3/> <span><strong>Orari</strong>{content.contactHours}</span></p><p><Phone/> <span><strong>Telefoni</strong>{content.contactPhone}</span></p><p><Mail/> <span><strong>Email</strong>{content.contactEmail}</span></p></div><div className="map-card"><div className="map-card-head"><MapPin size={18}/><span><strong>Gjeni Laboratorin Alfa</strong><small>Hapni hartën ose nisni drejtimin menjëherë.</small></span></div><iframe title="Harta e Laboratorit Alfa" loading="lazy" src={`https://www.google.com/maps?q=${alfaMap.coordinates}&z=16&output=embed`}/><a className="button map-directions" href={alfaMap.directions} target="_blank" rel="noreferrer">Merr drejtimin në Google Maps <ArrowRight size={16}/></a></div></div><form className="contact-form" onSubmit={onSubmit}><label>Emri<input required name="name" placeholder="Emri juaj"/></label><label>Email<input required type="email" name="email" placeholder="email@shembull.al"/></label><label>Mesazhi<textarea required name="message" placeholder="Si mund t’ju ndihmojmë?"/></label><button className="button primary">Dërgo mesazhin <ArrowRight size={16}/></button>{sent && <small>Faleminderit. Mesazhi u ruajt me sukses.</small>}</form></section>; }

function Admin({ onClose, content, setContent, articles, setArticles }) {
  const [authenticated, setAuthenticated] = useState(false); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const [draft, setDraft] = useState({ title: '', excerpt: '', body: '', category: 'Artikuj', imageId: null }); const [editing, setEditing] = useState(null);
  useEffect(() => { api('/api/admin/session').then(() => setAuthenticated(true)).catch(() => {}); }, []);
  const login = async e => { e.preventDefault(); try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }); setAuthenticated(true); } catch (err) { setError(err.message); } };
  const saveContent = key => api(`/api/admin/content/${key}`, { method: 'PUT', body: JSON.stringify({ value: content[key] }) });
  const upload = async file => { const form = new FormData(); form.append('image', file); const response = await fetch('/api/admin/images', { method: 'POST', body: form }); if (!response.ok) throw new Error('Ngarkimi dështoi.'); const image = await response.json(); setDraft(item => ({ ...item, imageId: image.id })); };
  const saveArticle = async e => { e.preventDefault(); const item = editing ? await api(`/api/admin/articles/${editing}`, { method: 'PUT', body: JSON.stringify(draft) }) : await api('/api/admin/articles', { method: 'POST', body: JSON.stringify(draft) }); setArticles(old => editing ? old.map(article => article.id === item.id ? item : article) : [item, ...old]); setEditing(null); setDraft({ title: '', excerpt: '', body: '', category: 'Artikuj', imageId: null }); };
  if (!authenticated) return <div className="admin-overlay"><div className="admin-login"><button className="close" onClick={onClose}><X/></button><LockKeyhole/><p className="eyebrow">Hapësirë private</p><h2>Administratori</h2><form onSubmit={login}><input type="password" autoFocus placeholder="Fjalëkalimi" value={password} onChange={e => setPassword(e.target.value)}/>{error && <small>{error}</small>}<button className="button primary">Hyr në panel <ArrowRight size={16}/></button></form></div></div>;
  return <div className="admin-overlay"><aside className="admin-panel"><div className="admin-top"><div><p className="eyebrow">Panel privat</p><h2>Redakto përmbajtjen</h2></div><button className="close" onClick={onClose}><X/></button></div><section><h3>Kontakt</h3>{[['contactAddress','Adresa'],['contactHours','Orari'],['contactPhone','Telefoni'],['contactEmail','Email']].map(([key, label]) => <label className="edit-field" key={key}><span>{label}</span><textarea value={content[key] || ''} onChange={e => setContent(old => ({ ...old, [key]: e.target.value }))} onBlur={() => saveContent(key)}/></label>)}</section><section><div className="admin-title"><h3>{editing ? 'Redakto artikullin' : 'Artikull i ri'}</h3>{editing && <button onClick={() => { setEditing(null); setDraft({ title: '', excerpt: '', body: '', category: 'Artikuj', imageId: null }); }}>Anulo</button>}</div><form className="article-form" onSubmit={saveArticle}><input required placeholder="Titulli" value={draft.title} onChange={e => setDraft(item => ({ ...item, title: e.target.value }))}/><input required placeholder="Kategoria" value={draft.category} onChange={e => setDraft(item => ({ ...item, category: e.target.value }))}/><textarea required placeholder="Përmbledhja" value={draft.excerpt} onChange={e => setDraft(item => ({ ...item, excerpt: e.target.value }))}/><textarea placeholder="Teksti i plotë" value={draft.body || ''} onChange={e => setDraft(item => ({ ...item, body: e.target.value }))}/><label className="upload"><Upload size={16}/>{draft.imageId ? 'Foto e bashkëngjitur' : 'Shto foto (maks. 5 MB)'}<input type="file" accept="image/*" onChange={e => e.target.files[0] && upload(e.target.files[0])}/></label><button className="button primary">Ruaj artikullin <Check size={16}/></button></form></section><section><h3>Artikujt ekzistues</h3>{articles.map(article => <div className="admin-article" key={article.id}><span>{article.title}</span><button onClick={() => { setEditing(article.id); setDraft(article); }}>Redakto</button><button className="danger" onClick={async () => { await api(`/api/admin/articles/${article.id}`, { method: 'DELETE' }); setArticles(old => old.filter(item => item.id !== article.id)); }}>Fshi</button></div>)}</section></aside></div>;
}

function Home({ content, pages, articles, setArticles, admin, setAdmin, sent, onContact }) { const [menu, setMenu] = useState(false); return <><Header menu={menu} setMenu={setMenu}/><main><section className="hero" id="fillimi"><div className="hero-copy"><p className="eyebrow">Diagnostikim laboratorik · Tiranë</p><h1>Qartësi për çdo<br/><em>hap të shëndetit.</em></h1><p className="hero-text">Rezultate laboratorike të besueshme, të mbështetura në përvojë, profesionalizëm dhe kujdes për pacientin.</p><div className="hero-actions"><a className="button primary" href="#sherbimet">Eksploro shërbimet <ArrowRight size={17}/></a><a className="button ghost" href="#kontakt">Na kontaktoni</a></div><div className="hero-trust"><ShieldCheck/><span><strong>Që prej vitit 2008</strong><br/>me fokus te cilësia e rezultatit</span></div></div><div className="hero-visual"><div className="orb orb-one"></div><div className="orb orb-two"></div><div className="tube"><i></i><b></b></div><div className="visual-note"><Microscope size={20}/><span>Ekspertizë në<br/><strong>Mikrobiologji</strong></span></div></div></section><section className="intro" id="rreth"><div><p className="eyebrow">Laboratori Alfa</p><h2>Një përgjigje e saktë fillon me një proces të bërë <em>me kujdes.</em></h2></div><div><p>{content.about}</p><a href="/#sherbimet" className="text-link">Shihni katalogun e plotë <ArrowRight size={16}/></a></div></section><section className="reasons" id="pse-alfa"><div className="section-heading"><div><p className="eyebrow">Pse të zgjidhni Alfa?</p><h2>Besimi ndërtohet <em>në çdo detaj.</em></h2></div></div><div className="reason-grid">{[[ShieldCheck,'Përvojë profesionale','Mbi 29 vite përvojë në laboratorin klinik dhe mikrobiologjik.'],[FlaskConical,'Metoda bashkëkohore','Analiza të realizuara me fokus te saktësia dhe cilësia.'],[LockKeyhole,'Etikë & konfidencialitet','Respekt maksimal për privatësinë dhe të dhënat e pacientit.'],[Microscope,'Ekspertizë në mikrobiologji','Një nga pikat më të forta të Laboratorit Alfa.']].map(([Icon,title,text]) => <article key={title}><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div></section><PageGrid pages={pages}/><Articles articles={articles}/><Contact content={content} sent={sent} onSubmit={onContact}/></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa. Diagnostikim me besim.</p><button onClick={() => setAdmin(true)}>Admin</button></footer>{admin && <Admin onClose={() => setAdmin(false)} content={content} setContent={() => {}} articles={articles} setArticles={setArticles}/>}</>; }

function KnowledgePage({ slug }) { const [page, setPage] = useState(null); const [related, setRelated] = useState([]); const [menu, setMenu] = useState(false); useEffect(() => { api(`/api/knowledge/${encodeURIComponent(slug)}`).then(item => { setPage(item); api('/api/knowledge').then(items => setRelated(items.filter(x => x.section === item.section && x.slug !== item.slug).slice(0, 7))); }).catch(() => setPage(false)); }, [slug]); if (page === null) return <><Header menu={menu} setMenu={setMenu}/><main className="loading-page">Duke hapur temën…</main></>; if (!page) return <><Header menu={menu} setMenu={setMenu}/><main className="loading-page"><h1>Faqja nuk u gjet.</h1><a className="button primary" href="/#sherbimet">Kthehu te katalogu</a></main></>; const cleanBody = withoutHierarchyNumbers(page.body); return <><Header menu={menu} setMenu={setMenu}/><main className="knowledge-page"><a className="back-link" href="/#sherbimet"><ArrowLeft size={17}/> Katalogu i shërbimeve</a><p className="eyebrow">{page.category} · {page.section}</p><h1>{page.title}</h1><div className="knowledge-layout"><article className="knowledge-article">{cleanBody.split(/\n\n+/).filter(Boolean).map((paragraph, index) => <p className={/^[🧪📋⚠️]/u.test(paragraph) ? 'knowledge-heading' : ''} key={index}>{paragraph}</p>)}<div className="medical-note"><ShieldCheck size={19}/><span>Informacioni është orientues dhe nuk zëvendëson këshillën e mjekut. Për interpretimin e rezultateve, konsultohuni me profesionistin shëndetësor.</span></div></article><aside className="related-pages"><p className="eyebrow">Në të njëjtin sektor</p>{related.map(item => <a href={pageUrl(item.slug)} key={item.slug}>{item.title}<ChevronRight size={15}/></a>)}</aside></div></main><footer><Logo/><p>© {new Date().getFullYear()} Laboratori Alfa.</p></footer></>; }

function App() { const [content, setContent] = useState(fallback); const [pages, setPages] = useState([]); const [articles, setArticles] = useState([]); const [admin, setAdmin] = useState(false); const [sent, setSent] = useState(false); useEffect(() => { api('/api/content').then(data => setContent(old => ({ ...old, ...data }))).catch(() => {}); api('/api/knowledge').then(setPages).catch(() => {}); api('/api/articles').then(setArticles).catch(() => {}); }, []); const contact = async e => { e.preventDefault(); try { await api('/api/contact', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) }); setSent(true); e.target.reset(); } catch {} }; const slug = window.location.pathname.startsWith('/sherbimet/') ? decodeURIComponent(window.location.pathname.slice('/sherbimet/'.length)) : ''; return slug ? <KnowledgePage slug={slug}/> : <Home content={content} pages={pages} articles={articles} setArticles={setArticles} admin={admin} setAdmin={setAdmin} sent={sent} onContact={contact}/>; }

createRoot(document.getElementById('root')).render(<App/>);
