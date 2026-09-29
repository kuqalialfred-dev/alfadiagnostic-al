// Struktura zyrtare e kapitujve sipas Struktura_alfasiagnostic.al.pdf.
// Çdo kapitull kryesor ka nënkapitujt e tij të drejtpërdrejtë.
export const catalogTree = [
  {
    title: 'Mykologji',
    branches: [
      { title: 'Infeksionet e lëkurës, thonjve dhe flokëve', groups: [] },
      { title: 'Infeksionet e mukozave', groups: [] },
      { title: 'Infeksionet sistemike', groups: [] }
    ]
  },
  {
    title: 'Bakteriologji',
    branches: [
      { title: 'Infeksione gastrointestinale', groups: [] },
      { title: 'Infeksione urinare', groups: [] },
      { title: 'Infeksione respiratore', groups: [] },
      { title: 'Infeksione seksualisht të transmetueshme', groups: [] },
      { title: 'Infeksione të tjera', groups: [] }
    ]
  },
  {
    title: 'Parazitologji',
    branches: [
      { title: 'Parazitët e zorrëve', groups: [] },
      { title: 'Parazitët e indeve dhe organeve', groups: [] },
      { title: 'Parazitët seksualisht të transmetueshëm', groups: [] }
    ]
  },
  {
    title: 'Virologji',
    branches: [
      { title: 'Hepatitet Virale', groups: [] },
      { title: 'Infeksionet Virale Seksualisht të Transmetueshme', groups: [] },
      { title: 'Infeksionet Virale Respiratore', groups: [] },
      { title: 'Viruse të tjera me rëndësi klinike', groups: [] }
    ]
  },
  { title: 'Analiza Klinike', branches: [{ title: 'Analiza Klinike', groups: [] }] },
  { title: 'Biokimi', branches: [{ title: 'Biokimi', groups: [] }] },
  { title: 'Hormonet', branches: [{ title: 'Hormonet', groups: [] }] },
  { title: 'Imunologji', branches: [{ title: 'Imunologji', groups: [] }] }
];
