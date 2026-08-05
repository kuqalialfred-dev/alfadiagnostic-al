export const services = [
  { group: 'Infeksionet', icon: '01', areas: [
    { title: 'Mikologji', children: [
      { title: 'Infeksionet e lëkurës, thonjve dhe flokëve', tests: ['1.1.01 Onikomikoza','1.1.02 Tinea pedis','1.1.03 Tinea corporis','1.1.04 Tinea capitis','1.1.05 Tinea barbae','1.1.06 Tinea manuum','1.1.07 Tinea cruris','1.1.08 Pityriasis versicolor','1.1.09 Dermatitet nga Candida'] },
      { title: 'Infeksionet e mukozave', tests: ['1.2.01 Kandidoza vaginale','1.2.02 Kandidoza orale','1.2.03 Kandidoza ezofagiale','1.2.04 Kandidoza intestinale'] },
      { title: 'Infeksionet sistemike', tests: ['1.3.01 Kandidemia','1.3.02 Kriptokokoza','1.3.03 Aspergilloza','1.3.04 Mukormikoza'] }
    ]},
    { title: 'Bakteriologji', tests: ['Infeksionet respiratore','Infeksionet urinare','Infeksionet gastrointestinale','Infeksionet e lëkurës dhe plagëve','Infeksionet seksualisht të transmetueshme','Infeksionet sistemike','Rezistenca bakteriale ndaj antibiotikëve'] },
    { title: 'Parazitologji', tests: ['Protozoarët','Helmintët','Ektoparazitët'] },
    { title: 'Virologji', tests: ['Hepatitet virale','Viruset respiratore','Viruset seksualisht të transmetueshme','Viruse të tjera'] }
  ]},
  { group: 'Analizat', icon: '02', areas: [
    { title: 'Analiza Klinike', tests: ['Hematologji','Analiza të urinës','Analiza të feçeve','Koagulimi','Analiza të tjera klinike'] },
    { title: 'Biokimi', tests: ['Funksioni i mëlçisë','Funksioni i veshkave','Profili lipidik','Metabolizmi i glukozës','Elektrolitet dhe mineralet','Enzimat','Proteinat','Vitaminat','Analiza të tjera biokimike'] },
    { title: 'Hormonet', tests: ['Tiroidja','Fertiliteti','Hormonet seksuale','Gjëndra mbiveshkore','Hipofiza','Hormone të tjera'] },
    { title: 'Imunologjia', tests: ['Autoimuniteti','Markuesit infektivë','Imunoglobulinat','Markuesit tumoralë','Alergjia','Analiza të tjera imunologjike'] }
  ]}
];
