// Struktura zyrtare e kapitujve sipas Struktura_alfasiagnostic.al.pdf.
// Çdo kapitull kryesor ka nënkapitujt e tij të drejtpërdrejtë.
export const catalogTree = [
  {
    title: 'Mykologji',
    branches: [
      { title: '1.1 Infeksionet e lëkurës, thonjve dhe flokëve', groups: [] },
      { title: '1.2 Infeksionet e mukozave', groups: [] },
      { title: '1.3 Infeksionet sistemike', groups: [] }
    ]
  },
  {
    title: 'Bakteriologji',
    branches: [
      { title: '2.1 Infeksione gastrointestinale', groups: [] },
      { title: '2.2 Infeksione urinare', groups: [] },
      { title: '2.3 Infeksione respiratore', groups: [] },
      { title: '2.4 Infeksione seksualisht të transmetueshme', groups: [] },
      { title: '2.5 Infeksione të tjera', groups: [] }
    ]
  },
  {
    title: 'Parazitologji',
    branches: [
      { title: '3.1 Parazitët e zorrëve', groups: [] },
      { title: '3.2 Parazitët e indeve dhe organeve', groups: [] },
      { title: '3.3 Parazitët seksualisht të transmetueshëm', groups: [] }
    ]
  },
  {
    title: 'Virologji',
    branches: [
      { title: '4.1 Hepatitet Virale', groups: [] },
      { title: '4.2 Infeksionet Virale Seksualisht të Transmetueshme', groups: [] },
      { title: '4.3 Infeksionet Virale Respiratore', groups: [] },
      { title: '4.4 Viruse të tjera me rëndësi klinike', groups: [] }
    ]
  },
  { title: 'Analiza Klinike', branches: [{ title: '5. Analiza Klinike', groups: [] }] },
  { title: 'Biokimi', branches: [{ title: '6. Biokimi', groups: [] }] },
  { title: 'Hormonet', branches: [{ title: '7. Hormonet', groups: [] }] },
  {
    title: 'Imunologji',
    branches: [
      { title: '8.1 Inflamacioni dhe Autoimuniteti', groups: [] },
      { title: '8.2 Komplementi', groups: [] },
      { title: '8.3 Imunoglobulinat', groups: [] },
      { title: '8.4 Imunologji Infektive', groups: [] }
    ]
  }
];
