/**
 * APLIKASI INFO CKG - PUSKESMAS BANJARAN KOTA
 * Module: Interactive Leaflet Map, Geocoding, Address Directory & Autonomous Explorer
 */

// ==========================================================================
// 🗺️ INTERACTIVE MAP & ADDRESS LEARNING (KABUPATEN BANDUNG, JAWA BARAT)
// ==========================================================================

let leafletMap = null;
let mapMarkersGroup = null;
let currentAddingPinMarker = null;

/* ==========================================================================
   🎯 ACCURATE KAMPUNG & ADMINISTRATIVE DIRECTORY LOOKUP (KAB. BANDUNG)
   ========================================================================== */

const ACCURATE_KAMPUNG_DIRECTORY = {
  // --- KECAMATAN BANJARAN (11 DESA) ---
  'PAJAGALAN': { kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIPEUNDEUY': { kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BANJARAN KULON': { kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BANJARAN KOTA': { kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'ALUN-ALUN BANJARAN': { kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BAROS BANJARAN': { kel: 'Banjaran Kulon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'BANJARAN WETAN': { kel: 'Banjaran Wetan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MUARA': { kel: 'Banjaran Wetan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SINDANGLENGO': { kel: 'Banjaran Wetan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PASIRHALANG': { kel: 'Banjaran Wetan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'TARAJUSARI': { kel: 'Tarajusari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIPAKU': { kel: 'Tarajusari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SANGGAR MAS': { kel: 'Tarajusari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SANGGAR MAS LESTARI': { kel: 'Tarajusari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'KEBON SAWO': { kel: 'Tarajusari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'KAMASAN': { kel: 'Kamasan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'KEBON HUI': { kel: 'Kamasan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CITALIKTIK': { kel: 'Kamasan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PATROL': { kel: 'Kamasan', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'KIANGROKE': { kel: 'Kiangroke', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PAMOYANAN': { kel: 'Kiangroke', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BOJONG': { kel: 'Kiangroke', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'PASIRHUNI': { kel: 'Pasirhuni', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SUKASARI PASIRHUNI': { kel: 'Pasirhuni', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'SINDANGPANON': { kel: 'Sindangpanon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SINDANGPARANG': { kel: 'Sindangpanon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIBATOK': { kel: 'Sindangpanon', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'CIAPUS': { kel: 'Ciapus', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'LEGOK': { kel: 'Ciapus', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIAPUS HILIR': { kel: 'Ciapus', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIAPUS GIRANG': { kel: 'Ciapus', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'NEGLASARI': { kel: 'Neglasari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SUKATANI': { kel: 'Neglasari', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'MARGAHAYU': { kel: 'Margahayu', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIKUPA': { kel: 'Margahayu', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  'CIPINANG': { kel: 'Cipinang', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIPEUJEUH': { kel: 'Cipinang', kec: 'Banjaran', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN CANGKUANG ---
  'BANDASARI': { kel: 'Bandasari', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIKOPO': { kel: 'Bandasari', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CANGKUANG': { kel: 'Cangkuang', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CILUNCAT': { kel: 'Ciluncat', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'JATISARI': { kel: 'Jatisari', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'NAGRAK': { kel: 'Nagrak', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'TANJUNGSARI': { kel: 'Tanjungsari', kec: 'Cangkuang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN ARJASARI ---
  'ARJASARI': { kel: 'Arjasari', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'ANCOLMEKAR': { kel: 'Ancolmekar', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BAROS': { kel: 'Baros', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BATUKARUT': { kel: 'Batukarut', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MANGGUNHJAYA': { kel: 'Mangunjaya', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PINGGIRSARI': { kel: 'Pinggirsari', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RANCAKOLE': { kel: 'Rancacole', kec: 'Arjasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN CIMAUNG ---
  'CIMAUNG': { kel: 'Cimaung', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIKALONG': { kel: 'Cikalong', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CAMPAKA': { kel: 'Cikalong', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'JAGABAY': { kel: 'Jagabay', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MALASARI': { kel: 'Malasari', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MEKARSARI': { kel: 'Mekarsari', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'WARJABAKTI': { kel: 'Warjabakti', kec: 'Cimaung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN PAMEUNGPEUK ---
  'PAMEUNGPEUK': { kel: 'Sukasari', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SUKASARI': { kel: 'Sukasari', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'LANGONSARI': { kel: 'Langonsari', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'WAAS': { kel: 'Langonsari', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RANCAMULYA': { kel: 'Rancamulya', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BOJONGKONENG': { kel: 'Rancamulya', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RANCATUNGKU': { kel: 'Rancatungku', kec: 'Pameungpeuk', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN SOREANG ---
  'SOREANG': { kel: 'Soreang', kec: 'Soreang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SADU': { kel: 'Sadu', kec: 'Soreang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SEKARWANGI': { kel: 'Sekarwangi', kec: 'Soreang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PANYIRAPAN': { kel: 'Panyirapan', kec: 'Soreang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'KARAMATMULYA': { kel: 'Karamatmulya', kec: 'Soreang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PARUNGSERAB': { kel: 'Parungserab', kec: 'Soreang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN KATAPANG ---
  'KATAPANG': { kel: 'Gandasari', kec: 'Katapang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'GANDASARI': { kel: 'Gandasari', kec: 'Katapang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SANGKANHURIP': { kel: 'Sangkanhurip', kec: 'Katapang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PANGAUBAN': { kel: 'Pangauban', kec: 'Katapang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN BALEENDAH ---
  'ANDIR': { kel: 'Andir', kec: 'Baleendah', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BOJONGMALAKA': { kel: 'Bojongmalaka', kec: 'Baleendah', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MALAKASARI': { kel: 'Malakasari', kec: 'Baleendah', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RANCAMANYAR': { kel: 'Rancamanyar', kec: 'Baleendah', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'WARGAMEKAR': { kel: 'Wargamekar', kec: 'Baleendah', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN DAYEUHKOLOT ---
  'CITEUREUP': { kel: 'Citeureup', kec: 'Dayeuhkolot', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CANGKUANG BARAT': { kel: 'Cangkuang Barat', kec: 'Dayeuhkolot', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PASAWAHAN': { kel: 'Pasawahan', kec: 'Dayeuhkolot', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SUKAPURA': { kel: 'Sukapura', kec: 'Dayeuhkolot', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN MARGAHAYU ---
  'SAYATI': { kel: 'Sayati', kec: 'Margahayu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MARGAHAYU SELATAN': { kel: 'Margahayu Selatan', kec: 'Margahayu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MARGAHAYU TENGAH': { kel: 'Margahayu Tengah', kec: 'Margahayu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SUKAMENAK': { kel: 'Sukamenak', kec: 'Margahayu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN MARGAASIH ---
  'NANJUNG': { kel: 'Nanjung', kec: 'Margaasih', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIGONDEWAH HILIR': { kel: 'Cigondewah Hilir', kec: 'Margaasih', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'LAGADAR': { kel: 'Lagadar', kec: 'Margaasih', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RAHAYU': { kel: 'Rahayu', kec: 'Margaasih', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN CIWIDEY ---
  'PANUNDAAN': { kel: 'Lebakmuncang', kec: 'Ciwidey', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'LEBAKMUNCANG': { kel: 'Lebakmuncang', kec: 'Ciwidey', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'NENGKELAN': { kel: 'Nengkelan', kec: 'Ciwidey', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RAWABOGO': { kel: 'Rawabogo', kec: 'Ciwidey', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN PASIRJAMBU ---
  'TENJOLAYA': { kel: 'Tenjolaya', kec: 'Pasirjambu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIKONENG': { kel: 'Tenjolaya', kec: 'Pasirjambu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CISONDARI': { kel: 'Cisondari', kec: 'Pasirjambu', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN RANCABALI ---
  'ALAMENDAH': { kel: 'Alamendah', kec: 'Rancabali', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIPELAH': { kel: 'Cipelah', kec: 'Rancabali', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'INDRAGIRI': { kel: 'Indragiri', kec: 'Rancabali', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'PATENGAN': { kel: 'Patengan', kec: 'Rancabali', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN PANGALENGAN ---
  'PULOSARI': { kel: 'Pulosari', kec: 'Pangalengan', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'WARNASARI': { kel: 'Warnasari', kec: 'Pangalengan', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BANJARSARI': { kel: 'Banjarsari', kec: 'Pangalengan', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN BOJONGSOANG ---
  'BUAHBATU': { kel: 'Buahbatu', kec: 'Bojongsoang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BOJONGSARI': { kel: 'Bojongsari', kec: 'Bojongsoang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIPAGALO': { kel: 'Cipagalo', kec: 'Bojongsoang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'TEGALLUAR': { kel: 'Tegalluar', kec: 'Bojongsoang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN CILEUNYI ---
  'CINUNUK': { kel: 'Cinunuk', kec: 'Cileunyi', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CILEUNYI KULON': { kel: 'Cileunyi Kulon', kec: 'Cileunyi', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CILEUNYI WETAN': { kel: 'Cileunyi Wetan', kec: 'Cileunyi', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIMEKAR': { kel: 'Cimekar', kec: 'Cileunyi', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN RANCAEKEK ---
  'HAURPUGUR': { kel: 'Haurpugur', kec: 'Rancaekek', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'RANCAEKEK KULON': { kel: 'Rancaekek Kulon', kec: 'Rancaekek', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'BOJONGLOA': { kel: 'Bojongloa', kec: 'Rancaekek', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN MAJALAYA ---
  'PADAMULYA': { kel: 'Padamulya', kec: 'Majalaya', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MAJAKETA': { kel: 'Majakerta', kec: 'Majalaya', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MAJASETRA': { kel: 'Majasetra', kec: 'Majalaya', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN CIPARAY ---
  'GUNUNGLEUTIK': { kel: 'Gunungleutik', kec: 'Ciparay', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIHEULANG': { kel: 'Ciheulang', kec: 'Ciparay', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIKUYA': { kel: 'Cikuya', kec: 'Ciparay', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },

  // --- KECAMATAN IBUN, SOLOKANJAN TUNG, KERTASARI, PACET, PASEH, NAGREG ---
  'IBUN': { kel: 'Dukuh', kec: 'Ibun', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'SOLOKANJANTUNG': { kel: 'Bojongemas', kec: 'Solokanjantung', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'TARUMAJAYA': { kel: 'Tarumajaya', kec: 'Kertasari', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'MARUYUNG': { kel: 'Maruyung', kec: 'Pacet', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'NAGREG': { kel: 'Ciaro', kec: 'Nagreg', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CICALENGKA': { kel: 'Nagrog', kec: 'Cicalengka', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CILENGKRANG': { kel: 'Jatiendah', kec: 'Cilengkrang', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'CIMENYAN': { kel: 'Ciburial', kec: 'Cimenyan', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' },
  'KUTAWARINGIN': { kel: 'Buninagara', kec: 'Kutawaringin', kab: 'Kabupaten Bandung', prov: 'Jawa Barat' }
};

function getOfficialAddressLookup(kw) {
  if (!kw) return null;
  const cleanKw = String(kw).toUpperCase().replace(/^KP\.\s*/i, '').trim();

  // 1. Direct exact key match
  if (ACCURATE_KAMPUNG_DIRECTORY[cleanKw]) {
    return ACCURATE_KAMPUNG_DIRECTORY[cleanKw];
  }

  // 2. Strict exact word boundary match
  for (let k in ACCURATE_KAMPUNG_DIRECTORY) {
    if (k === cleanKw) {
      return ACCURATE_KAMPUNG_DIRECTORY[k];
    }
  }

  return null;
}

function detectAddressHierarchyFromRawText(rawAddressText, currentKel = '', currentKec = '', currentKab = '', currentProv = '') {
  if (!rawAddressText) {
    let kel = currentKel;
    let kec = currentKec;
    return {
      kel: kel || '',
      kec: kec || '',
      kab: currentKab || '',
      prov: currentProv || '',
      matchedKw: null
    };
  }

  const cleanText = String(rawAddressText).toUpperCase()
    .replace(/^KP\.\s*/i, '')
    .replace(/RT\s*\d+/gi, '')
    .replace(/RW\s*\d+/gi, '')
    .replace(/DESA\s*/gi, '')
    .replace(/KELURAHAN\s*/gi, '')
    .replace(/KECAMATAN\s*/gi, '')
    .trim();

  // 1. Direct match in ACCURATE_KAMPUNG_DIRECTORY by individual tokens
  const words = cleanText.split(/[\s,\.\/\-]+/).filter(w => w.length >= 3);
  for (let w of words) {
    if (ACCURATE_KAMPUNG_DIRECTORY[w]) {
      return {
        ...ACCURATE_KAMPUNG_DIRECTORY[w],
        matchedKw: w
      };
    }
  }

  // 2. Multi-word phrase key match in ACCURATE_KAMPUNG_DIRECTORY
  for (let k in ACCURATE_KAMPUNG_DIRECTORY) {
    if (cleanText.includes(k)) {
      return {
        ...ACCURATE_KAMPUNG_DIRECTORY[k],
        matchedKw: k
      };
    }
  }

  // 3. Learned address dictionary lookup match
  if (typeof getLearnedKampungMap === 'function') {
    const learnedList = getLearnedKampungMap();
    for (let item of learnedList) {
      const kw = (item.keywords && item.keywords[0]) ? item.keywords[0].toUpperCase() : '';
      if (kw && cleanText.includes(kw)) {
        return {
          kel: item.kel,
          kec: item.kec,
          kab: item.kab || '',
          prov: item.prov || '',
          matchedKw: kw
        };
      }
    }
  }

  // Fallback: use current values or empty
  let kel = currentKel;
  let kec = currentKec;

  return {
    kel: kel || '',
    kec: kec || '',
    kab: currentKab || '',
    prov: currentProv || '',
    matchedKw: null
  };
}

function realignLearnedAddressAccuracy() {
  const raw = localStorage.getItem('ckg_learned_kampung_map');
  if (!raw) return;
  try {
    let list = JSON.parse(raw);
    let modified = false;

    list.forEach(item => {
      const kw = (item.keywords && item.keywords[0]) ? item.keywords[0].toUpperCase().replace(/^KP\.\s*/i, '').trim() : '';

      // Check official lookup dictionary for exact match
      const verified = getOfficialAddressLookup(kw);
      if (verified) {
        if (item.kel !== verified.kel || item.kec !== verified.kec) {
          console.log(`[ADDRESS REALIGN] Corrected "${kw}": ${item.kel} -> ${verified.kel}, ${item.kec} -> ${verified.kec}`);
          item.kel = verified.kel;
          item.kec = verified.kec;
          item.kab = verified.kab;
          item.prov = verified.prov;
          modified = true;
        }
      } else if (item.kel === 'Banjaran Kota') {
        // If legacy item has 'Banjaran Kota' and no specific kampung override, convert kelurahan label to 'Banjaran Kulon'
        item.kel = 'Banjaran Kulon';
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error realigning address knowledge:', e);
  }
}

function addToDeletedBlacklist(kw) {
  if (!kw) return;
  const cleanKw = String(kw).toUpperCase().trim();
  const raw = localStorage.getItem('ckg_deleted_kampungs_blacklist');
  let setArr = [];
  if (raw) {
    try { setArr = JSON.parse(raw); } catch (e) { setArr = []; }
  }
  if (!setArr.includes(cleanKw)) {
    setArr.push(cleanKw);
    localStorage.setItem('ckg_deleted_kampungs_blacklist', JSON.stringify(setArr));
  }
}

function getLearnedKampungMap() {
  const raw = localStorage.getItem('ckg_learned_kampung_map');
  let list = [];
  if (raw) {
    try { list = JSON.parse(raw); } catch (e) { list = []; }
  }

  // Filter out deleted/blacklisted keywords
  const deletedList = typeof getDeletedKampungList === 'function' ? getDeletedKampungList() : [];
  const blacklistRaw = localStorage.getItem('ckg_deleted_kampungs_blacklist');
  let blacklist = [];
  if (blacklistRaw) {
    try { blacklist = JSON.parse(blacklistRaw); } catch (e) { blacklist = []; }
  }
  const combinedFilter = [...new Set([...deletedList, ...blacklist])];

  if (combinedFilter.length > 0) {
    list = list.filter(item => {
      const kw = (Array.isArray(item.keywords) ? item.keywords[0] : item.keywords) || '';
      return !combinedFilter.includes(String(kw).toUpperCase().trim());
    });
  }

  updateAiDbSavedCounterUI();
  return list;
}

function updateAiDbSavedCounterUI() {
  const badgeEl = document.getElementById('aiDbSavedCountText');
  if (badgeEl) {
    const raw = localStorage.getItem('ckg_learned_kampung_map');
    let count = 0;
    if (raw) {
      try { count = JSON.parse(raw).length; } catch (e) { count = 0; }
    }
    badgeEl.textContent = `${count} Titik`;
  }
}

async function saveLearnedKampungKeyword(kw, kel, kec, kab = 'Kabupaten Bandung', prov = 'Jawa Barat', syncToCloud = true, lat = null, lng = null) {
  if (!kw) return;
  const cleanKw = String(kw).toUpperCase().replace(/^KP\.\s*/i, '').trim();

  // Prefer provided Kelurahan & Kecamatan to support identical kampung names across different villages
  const finalKel = kel || '';
  const finalKec = kec || '';
  const finalKab = kab || '';
  const finalProv = prov || '';

  const list = getLearnedKampungMap();

  // Match uniqueness by: Kampung Name + Kelurahan + Kecamatan (So identical names in different villages are kept!)
  const existingIndex = list.findIndex(item => {
    const itemKw = (Array.isArray(item.keywords) ? item.keywords[0] : item.keywords) || '';
    const itemCleanKw = String(itemKw).toUpperCase().replace(/^KP\.\s*/i, '').trim();
    const itemKel = String(item.kel || '').toUpperCase().trim();
    const itemKec = String(item.kec || '').toUpperCase().trim();

    return itemCleanKw === cleanKw && itemKel === String(finalKel).toUpperCase().trim() && itemKec === String(finalKec).toUpperCase().trim();
  });

  const entry = {
    keywords: [cleanKw],
    kel: finalKel,
    kec: finalKec,
    kab: finalKab,
    prov: finalProv,
    lat: lat,
    lng: lng
  };

  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...entry };
  } else {
    list.push(entry);
  }

  localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(list));
  // Clear the reset flag since new data is being saved - auto-preseed can resume if ever needed
  localStorage.removeItem('ckg_dictionary_is_reset');
  updateAiDbSavedCounterUI();

  if (syncToCloud) {
    try {
      await fetch('/api/kamus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: cleanKw,
          kelurahan: finalKel,
          kecamatan: finalKec,
          kab_kota: finalKab,
          provinsi: finalProv,
          lat: lat,
          lng: lng
        })
      });
    } catch (err) {
      console.warn('Sync to D1 Kamus Error:', err);
    }
  }
}



// Pre-defined coordinate lookup dictionary for Kabupaten Bandung kampungs/kelurahans
const KAB_BANDUNG_COORDS_MAP = {
  // Kecamatan Banjaran
  'BANJARAN KULON': [-7.0427, 107.5878],
  'BANJARAN KOTA': [-7.0427, 107.5878],
  'BANJARAN WETAN': [-7.0485, 107.5920],
  'BANJARAN': [-7.0427, 107.5878],
  'PAJAGALAN': [-7.0410, 107.5890],
  'ALUN-ALUN': [-7.0435, 107.5865],
  'CIAPUS': [-7.0350, 107.5810],
  'KAMASAN': [-7.0380, 107.5950],
  'KIANGROKE': [-7.0250, 107.5890],
  'MARGAHAYU': [-7.0510, 107.5820],
  'NEGLASARI': [-7.0600, 107.5980],
  'PASIRHUNI': [-7.0650, 107.5750],
  'SINDANGPANON': [-7.0550, 107.6050],
  'TARAJUSARI': [-7.0310, 107.6010],
  // Kecamatan Cangkuang
  'BANDASARI': [-7.0210, 107.5620],
  'CANGKUANG': [-7.0150, 107.5580],
  'CILUNCAT': [-7.0180, 107.5690],
  'JATISARI': [-7.0230, 107.5740],
  'NAGRAK': [-7.0090, 107.5610],
  'TANJUNGSARI': [-7.0120, 107.5510],
  // Kecamatan Arjasari
  'ARJASARI': [-7.0450, 107.6250],
  'ANCOLMEKAR': [-7.0520, 107.6350],
  'BAROS': [-7.0380, 107.6150],
  'BINGKUR': [-7.0620, 107.6410],
  'MANGGUNGJAYA': [-7.0410, 107.6290],
  'MEKARJAYA': [-7.0480, 107.6210],
  'PINGGIRSARI': [-7.0580, 107.6320],
  'RANCAKOLE': [-7.0650, 107.6250],
  'WARGALAKSANA': [-7.0350, 107.6380],
  // Kecamatan Pameungpeuk
  'PAMEUNGPEUK': [-7.0050, 107.6050],
  'BATUKARUT': [-7.0050, 107.6050],
  'LANGONSARI': [-7.0120, 107.6120],
  'RANCAMANYAR': [-6.9850, 107.5950],
  'RANCATUNGKU': [-7.0010, 107.5980],
  'SUKASARI': [-7.0080, 107.6010],
  // Kecamatan Cimaung
  'CIMAUNG': [-7.0750, 107.5650],
  'CIKAPUNDUNG': [-7.0810, 107.5720],
  'MALASARI': [-7.0880, 107.5610],
  'PASIRHUNI': [-7.0690, 107.5780],
  'WARJABAKTI': [-7.0950, 107.5580],
  // Other Kab Bandung Key Hubs
  'SOREANG': [-7.0320, 107.5270],
  'KATAPANG': [-6.9980, 107.5620],
  'BALEENDAH': [-6.9820, 107.6280],
  'DAYEUHKOLOT': [-6.9850, 107.6180]
};

/* ==========================================================================
   🤖 AI AUTONOMOUS ADDRESS EXPLORER & LIVE MAP RADAR ENGINE
   ========================================================================== */

let isAiExplorerActive = false;
let aiExplorerInterval = null;
let aiScanSpeedMs = 4000; // Default 4 seconds per scan
let aiCurrentRegionIndex = 0; // 0: Kab. Bandung, 1: Kota Bandung & KBB
let aiCurrentKecIndex = 0;
let aiCurrentPointIndex = 0;
let aiLearnedCountTotal = 0;

let aiRadarMarker = null;
let aiTrajectoryPolyline = null;
let aiTrajectoryPoints = [];
let aiAutoFollowMap = false;

// 31 Kecamatan in Kabupaten Bandung with key villages & coordinates
const KAB_BANDUNG_EXPLORATION_MAP = [
  // Kecamatan Banjaran (11 Desa Masing-Masing)
  { kec: 'Banjaran', kel: 'Banjaran Kulon', kampungs: ['Kp. Pajagalan', 'Kp. Cipeundeuy', 'Kp. Banjaran Kulon', 'Kp. Alun-Alun Banjaran', 'Kp. Baros Banjaran'], coords: [-7.0427, 107.5878] },
  { kec: 'Banjaran', kel: 'Banjaran Wetan', kampungs: ['Kp. Banjaran Wetan', 'Kp. Muara', 'Kp. Sindanglengo', 'Kp. Pasirhalang'], coords: [-7.0485, 107.5920] },
  { kec: 'Banjaran', kel: 'Tarajusari', kampungs: ['Kp. Tarajusari', 'Kp. Cipaku', 'Kp. Sanggar Mas', 'Kp. Sanggar Mas Lestari', 'Kp. Kebon Sawo'], coords: [-7.0310, 107.6010] },
  { kec: 'Banjaran', kel: 'Kamasan', kampungs: ['Kp. Kamasan', 'Kp. Kebon Hui', 'Kp. Citaliktik', 'Kp. Patrol'], coords: [-7.0380, 107.5950] },
  { kec: 'Banjaran', kel: 'Kiangroke', kampungs: ['Kp. Kiangroke', 'Kp. Pamoyanan', 'Kp. Bojong'], coords: [-7.0250, 107.5890] },
  { kec: 'Banjaran', kel: 'Pasirhuni', kampungs: ['Kp. Pasirhuni', 'Kp. Sukasari Pasirhuni'], coords: [-7.0650, 107.5750] },
  { kec: 'Banjaran', kel: 'Sindangpanon', kampungs: ['Kp. Sindangpanon', 'Kp. Sindangparang', 'Kp. Cibatok'], coords: [-7.0550, 107.6050] },
  { kec: 'Banjaran', kel: 'Ciapus', kampungs: ['Kp. Ciapus', 'Kp. Legok', 'Kp. Ciapus Hilir', 'Kp. Ciapus Girang'], coords: [-7.0350, 107.5810] },
  { kec: 'Banjaran', kel: 'Neglasari', kampungs: ['Kp. Neglasari', 'Kp. Sukatani'], coords: [-7.0600, 107.5980] },
  { kec: 'Banjaran', kel: 'Margahayu', kampungs: ['Kp. Margahayu', 'Kp. Cikupa'], coords: [-7.0510, 107.5820] },
  { kec: 'Banjaran', kel: 'Cipinang', kampungs: ['Kp. Cipinang', 'Kp. Cipeujeuh'], coords: [-7.0620, 107.5720] },
  // Kecamatan Cangkuang
  { kec: 'Cangkuang', kel: 'Bandasari', kampungs: ['Kp. Bandasari', 'Kp. Cikopo'], coords: [-7.0210, 107.5620] },
  { kec: 'Cangkuang', kel: 'Cangkuang', kampungs: ['Kp. Cangkuang'], coords: [-7.0150, 107.5580] },
  { kec: 'Cangkuang', kel: 'Ciluncat', kampungs: ['Kp. Ciluncat'], coords: [-7.0180, 107.5690] },
  { kec: 'Cangkuang', kel: 'Jatisari', kampungs: ['Kp. Jatisari'], coords: [-7.0230, 107.5740] },
  { kec: 'Cangkuang', kel: 'Nagrak', kampungs: ['Kp. Nagrak'], coords: [-7.0090, 107.5610] },
  { kec: 'Cangkuang', kel: 'Tanjungsari', kampungs: ['Kp. Tanjungsari'], coords: [-7.0120, 107.5510] },
  // Kecamatan Pameungpeuk
  { kec: 'Pameungpeuk', kel: 'Sukasari', kampungs: ['Kp. Sukasari'], coords: [-7.0080, 107.6010] },
  { kec: 'Pameungpeuk', kel: 'Langonsari', kampungs: ['Kp. Langonsari', 'Kp. Waas'], coords: [-7.0120, 107.6120] },
  { kec: 'Pameungpeuk', kel: 'Rancamulya', kampungs: ['Kp. Rancamulya', 'Kp. Bojongkoneng'], coords: [-7.0050, 107.6050] },
  { kec: 'Pameungpeuk', kel: 'Rancatungku', kampungs: ['Kp. Rancatungku'], coords: [-7.0010, 107.5980] },
  // Kecamatan Arjasari
  { kec: 'Arjasari', kel: 'Arjasari', kampungs: ['Kp. Arjasari'], coords: [-7.0450, 107.6250] },
  { kec: 'Arjasari', kel: 'Ancolmekar', kampungs: ['Kp. Ancolmekar'], coords: [-7.0520, 107.6350] },
  { kec: 'Arjasari', kel: 'Baros', kampungs: ['Kp. Baros'], coords: [-7.0380, 107.6150] },
  { kec: 'Arjasari', kel: 'Batukarut', kampungs: ['Kp. Batukarut'], coords: [-7.0050, 107.6050] },
  { kec: 'Arjasari', kel: 'Mangunjaya', kampungs: ['Kp. Mangunjaya'], coords: [-7.0410, 107.6290] },
  { kec: 'Arjasari', kel: 'Pinggirsari', kampungs: ['Kp. Pinggirsari'], coords: [-7.0580, 107.6320] },
  { kec: 'Arjasari', kel: 'Rancacole', kampungs: ['Kp. Rancacole'], coords: [-7.0650, 107.6250] },
  // Kecamatan Cimaung
  { kec: 'Cimaung', kel: 'Cimaung', kampungs: ['Kp. Cimaung'], coords: [-7.0750, 107.5650] },
  { kec: 'Cimaung', kel: 'Cikalong', kampungs: ['Kp. Cikalong', 'Kp. Campaka'], coords: [-7.0780, 107.5620] },
  { kec: 'Cimaung', kel: 'Jagabay', kampungs: ['Kp. Jagabay'], coords: [-7.0850, 107.5650] },
  { kec: 'Cimaung', kel: 'Malasari', kampungs: ['Kp. Malasari'], coords: [-7.0880, 107.5610] },
  { kec: 'Cimaung', kel: 'Mekarsari', kampungs: ['Kp. Mekarsari'], coords: [-7.0910, 107.5580] },
  { kec: 'Cimaung', kel: 'Warjabakti', kampungs: ['Kp. Warjabakti'], coords: [-7.0950, 107.5580] },
  // Kecamatan Soreang
  { kec: 'Soreang', kel: 'Soreang', kampungs: ['Kp. Soreang'], coords: [-7.0320, 107.5270] },
  { kec: 'Soreang', kel: 'Sadu', kampungs: ['Kp. Sadu'], coords: [-7.0350, 107.5210] },
  { kec: 'Soreang', kel: 'Sekarwangi', kampungs: ['Kp. Sekarwangi'], coords: [-7.0280, 107.5310] },
  { kec: 'Soreang', kel: 'Panyirapan', kampungs: ['Kp. Panyirapan'], coords: [-7.0380, 107.5350] },
  { kec: 'Soreang', kel: 'Karamatmulya', kampungs: ['Kp. Karamatmulya'], coords: [-7.0250, 107.5380] },
  { kec: 'Soreang', kel: 'Parungserab', kampungs: ['Kp. Parungserab'], coords: [-7.0210, 107.5410] },
  // Kecamatan Katapang
  { kec: 'Katapang', kel: 'Gandasari', kampungs: ['Kp. Katapang', 'Kp. Gandasari', 'Kp. Sangkanhurip', 'Kp. Pangauban'], coords: [-6.9980, 107.5620] },
  // Kecamatan Baleendah
  { kec: 'Baleendah', kel: 'Andir', kampungs: ['Kp. Andir', 'Kp. Bojongmalaka', 'Kp. Malakasari', 'Kp. Rancamanyar', 'Kp. Wargamekar'], coords: [-6.9820, 107.6280] },
  // Kecamatan Dayeuhkolot
  { kec: 'Dayeuhkolot', kel: 'Citeureup', kampungs: ['Kp. Citeureup', 'Kp. Cangkuang Barat', 'Kp. Pasawahan', 'Kp. Sukapura'], coords: [-6.9850, 107.6180] },
  // Kecamatan Margahayu
  { kec: 'Margahayu', kel: 'Sayati', kampungs: ['Kp. Sayati', 'Kp. Margahayu Selatan', 'Kp. Margahayu Tengah', 'Kp. Sukamenak'], coords: [-6.9680, 107.5780] },
  // Kecamatan Margaasih
  { kec: 'Margaasih', kel: 'Nanjung', kampungs: ['Kp. Nanjung', 'Kp. Cigondewah Hilir', 'Kp. Lagadar', 'Kp. Rahayu'], coords: [-6.9550, 107.5450] },
  // Kecamatan Ciwidey
  { kec: 'Ciwidey', kel: 'Lebakmuncang', kampungs: ['Kp. Panundaan', 'Kp. Lebakmuncang', 'Kp. Nengkelan', 'Kp. Rawabogo', 'Kp. Prawatasari'], coords: [-7.0950, 107.4620] },
  // Kecamatan Pasirjambu
  { kec: 'Pasirjambu', kel: 'Tenjolaya', kampungs: ['Kp. Tenjolaya', 'Kp. Cikoneng', 'Kp. Cisondari', 'Kp. Mekarmaju'], coords: [-7.0750, 107.4850] },
  // Kecamatan Rancabali
  { kec: 'Rancabali', kel: 'Alamendah', kampungs: ['Kp. Alamendah', 'Kp. Cipelah', 'Kp. Indragiri', 'Kp. Patengan', 'Kp. Sukaresmi'], coords: [-7.1420, 107.4120] },
  // Kecamatan Pangalengan
  { kec: 'Pangalengan', kel: 'Pulosari', kampungs: ['Kp. Pulosari', 'Kp. Warnasari', 'Kp. Banjarsari', 'Kp. Margalaksana', 'Kp. Margamekar', 'Kp. Margamukti'], coords: [-7.1750, 107.5680] },
  // Kecamatan Bojongsoang
  { kec: 'Bojongsoang', kel: 'Buahbatu', kampungs: ['Kp. Buahbatu', 'Kp. Bojongsari', 'Kp. Cipagalo', 'Kp. Tegalluar'], coords: [-6.9720, 107.6450] },
  // Kecamatan Cileunyi
  { kec: 'Cileunyi', kel: 'Cinunuk', kampungs: ['Kp. Cinunuk', 'Kp. Cileunyi Kulon', 'Kp. Cileunyi Wetan', 'Kp. Cimekar'], coords: [-6.9380, 107.7250] },
  // Kecamatan Rancaekek
  { kec: 'Rancaekek', kel: 'Haurpugur', kampungs: ['Kp. Haurpugur', 'Kp. Rancaekek Kulon', 'Kp. Bojongloa', 'Kp. Cangkuang'], coords: [-6.9680, 107.7650] },
  // Kecamatan Majalaya
  { kec: 'Majalaya', kel: 'Padamulya', kampungs: ['Kp. Padamulya', 'Kp. Bojong', 'Kp. Majakerta', 'Kp. Sukamaju', 'Kp. Majasetra'], coords: [-7.0520, 107.7550] },
  // Kecamatan Ciparay
  { kec: 'Ciparay', kel: 'Gunungleutik', kampungs: ['Kp. Gunungleutik', 'Kp. Babakan', 'Kp. Ciheulang', 'Kp. Cikuya', 'Kp. Manggungharja'], coords: [-7.0380, 107.7120] },
  // Kecamatan Ibun
  { kec: 'Ibun', kel: 'Dukuh', kampungs: ['Kp. Ibun', 'Kp. Dukuh', 'Kp. Cibeet', 'Kp. Sudi', 'Kp. Tanggulun'], coords: [-7.0850, 107.7850] },
  // Kecamatan Solokanjantung
  { kec: 'Solokanjantung', kel: 'Bojongemas', kampungs: ['Kp. Solokanjantung', 'Kp. Bojongemas', 'Kp. Langensari', 'Kp. Padamukti'], coords: [-7.0120, 107.7420] },
  // Kecamatan Kertasari
  { kec: 'Kertasari', kel: 'Tarumajaya', kampungs: ['Kp. Tarumajaya', 'Kp. Cibeureum', 'Kp. Cikembang', 'Kp. Neglawangi', 'Kp. Santosa'], coords: [-7.2150, 107.6580] },
  // Kecamatan Pacet
  { kec: 'Pacet', kel: 'Maruyung', kampungs: ['Kp. Maruyung', 'Kp. Cikitu', 'Kp. Cikawao', 'Kp. Mandalahaji', 'Kp. Sukarame'], coords: [-7.0720, 107.6980] },
  // Kecamatan Paseh
  { kec: 'Paseh', kel: 'Cigentur', kampungs: ['Kp. Cigentur', 'Kp. Cipedes', 'Kp. Drawati', 'Kp. Sukamanah'], coords: [-7.0350, 107.7950] },
  // Kecamatan Cikancung
  { kec: 'Cikancung', kel: 'Cihanyir', kampungs: ['Kp. Cihanyir', 'Kp. Ciluluk', 'Kp. Hegarmanah', 'Kp. Mekarlaksana'], coords: [-7.0080, 107.8180] },
  // Kecamatan Nagreg
  { kec: 'Nagreg', kel: 'Ciaro', kampungs: ['Kp. Nagreg', 'Kp. Ciaro', 'Kp. Ciherang', 'Kp. Citaman', 'Kp. Ganjarsabar'], coords: [-7.0250, 107.8850] },
  // Kecamatan Cicalengka
  { kec: 'Cicalengka', kel: 'Nagrog', kampungs: ['Kp. Cicalengka', 'Kp. Babakanpeutey', 'Kp. Margaasih', 'Kp. Nagrog', 'Kp. Tenjolaya'], coords: [-6.9850, 107.8350] },
  // Kecamatan Cilengkrang
  { kec: 'Cilengkrang', kel: 'Jatiendah', kampungs: ['Kp. Cilengkrang', 'Kp. Cipanjalu', 'Kp. Melati', 'Kp. Jatiendah'], coords: [-6.8980, 107.7080] },
  // Kecamatan Cimenyan
  { kec: 'Cimenyan', kel: 'Ciburial', kampungs: ['Kp. Cimenyan', 'Kp. Ciburial', 'Kp. Cikadut', 'Kp. Mekarmanah'], coords: [-6.8680, 107.6650] },
  // Kecamatan Kutawaringin
  { kec: 'Kutawaringin', kel: 'Buninagara', kampungs: ['Kp. Kutawaringin', 'Kp. Buninagara', 'Kp. Cilame', 'Kp. Jatisari', 'Kp. Kopo'], coords: [-7.0050, 107.5180] }
];

// Region 2 expansion: Kota Bandung & KBB
const KOTA_BANDUNG_KBB_EXPLORATION_MAP = [
  { kec: 'Coblong (Kota Bandung)', kel: 'Dago', kampungs: ['Kp. Dago', 'Kp. Sekeloa', 'Kp. Tubagus Ismail', 'Kp. Lebak Siliwangi'], coords: [-6.8850, 107.6180] },
  { kec: 'Cicendo (Kota Bandung)', kel: 'Pasirkaliki', kampungs: ['Kp. Pasirkaliki', 'Kp. Arjuna', 'Kp. Pajajaran'], coords: [-6.9080, 107.5950] },
  { kec: 'Lembang (KBB)', kel: 'Lembang Kota', kampungs: ['Kp. Lembang', 'Kp. Cikole', 'Kp. Jayagiri', 'Kp. Kayuambon'], coords: [-6.8150, 107.6180] },
  { kec: 'Padalarang (KBB)', kel: 'Kertajaya', kampungs: ['Kp. Padalarang', 'Kp. Kertajaya', 'Kp. Ciburuy', 'Kp. Tagogapu'], coords: [-6.8380, 107.4780] },
  { kec: 'Cimahi Utara', kel: 'Cipageran', kampungs: ['Kp. Cipageran', 'Kp. Pasirkaliki Cimahi', 'Kp. Citeureup'], coords: [-6.8680, 107.5450] }
];

const EXPLORATION_REGIONS = [
  { name: 'Kabupaten Bandung', map: KAB_BANDUNG_EXPLORATION_MAP, totalKec: 31 },
  { name: 'Kota Bandung & KBB', map: KOTA_BANDUNG_KBB_EXPLORATION_MAP, totalKec: 5 },
];

let aiExplorerTimerInterval = null;
let aiExplorerSecondsLeft = 600; // Default 10 minutes (600 seconds)
let aiExplorerInitialDurationMinutes = 10;
let isAiTimerUnlimited = false;

function formatAiTimerDisplay(seconds) {
  if (isAiTimerUnlimited) return '♾️ Tanpa Batas';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateAiTimerUI() {
  const badgeEl = document.getElementById('aiTimerCountdownText');
  if (badgeEl) {
    badgeEl.textContent = `⏳ ${formatAiTimerDisplay(aiExplorerSecondsLeft)}`;
  }
}

function startAiExplorerCountdownTimer() {
  if (aiExplorerTimerInterval) clearInterval(aiExplorerTimerInterval);
  if (isAiTimerUnlimited) {
    updateAiTimerUI();
    return;
  }

  updateAiTimerUI();
  aiExplorerTimerInterval = setInterval(() => {
    if (!isAiExplorerActive) return;

    aiExplorerSecondsLeft--;
    updateAiTimerUI();

    if (aiExplorerSecondsLeft <= 0) {
      clearInterval(aiExplorerTimerInterval);
      stopAiExplorerTimerExpired();
    }
  }, 1000);
}

function stopAiExplorerTimerExpired() {
  isAiExplorerActive = false;

  const btnHeader = document.getElementById('btnAiExplorerToggleHeader');
  const btnHud = document.getElementById('btnToggleAiExplorer');
  const badge = document.getElementById('aiExplorerStateBadge');

  if (btnHeader) btnHeader.innerHTML = `<i class="bi bi-play-fill"></i> Mulai Jelajah AI`;
  if (btnHud) btnHud.innerHTML = `<i class="bi bi-play-fill"></i> Mulai Jelajah AI`;
  if (badge) {
    badge.className = 'badge badge-amber';
    badge.innerHTML = `<i class="bi bi-stopwatch-fill"></i> WAKTU SELESAI`;
  }

  updateAiLiveLog(`⏱️ WAKTU JELAJAH AI SELESAI (${aiExplorerInitialDurationMinutes} Menit). Penjelajahan dihentikan otomatis.`);

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: '⏱️ Waktu Jelajah AI Selesai!',
      text: `Sesi penjelajahan otomatis selama ${aiExplorerInitialDurationMinutes} menit telah selesai. Seluruh titik kampung baru yang ditemukan telah tersimpan di Cloud D1 Database.`,
      icon: 'info',
      confirmButtonText: '<i class="bi bi-play-circle-fill"></i> Mulai Sesi Baru',
      showCancelButton: true,
      cancelButtonText: 'Tutup',
      confirmButtonColor: '#4f46e5'
    }).then(res => {
      if (res.isConfirmed) {
        openSetAiTimerModal();
      }
    });
  } else if (typeof showToast === 'function') {
    showToast(`⏱️ Waktu Jelajah Selesai (${aiExplorerInitialDurationMinutes} Menit)!`, 'info');
  }
}

function checkAdminRoleOnly(actionName = 'fitur ini') {
  const currentUserRole = sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas');
  if (currentUserRole !== 'Admin') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '🔒 Akses Terbatas (Admin Only)',
        text: `Maaf, ${actionName} hanya dapat diakses & dijalankan oleh pengguna dengan Peran ADMIN.`,
        icon: 'warning',
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#f59e0b'
      });
    } else {
      alert(`🔒 Akses Terbatas: ${actionName} hanya dapat diakses oleh Admin.`);
    }
    return false;
  }
  return true;
}

function openSetAiTimerModal() {
  if (!checkAdminRoleOnly('Pengaturan Durasi Waktu Jelajah AI')) return;
  if (typeof Swal === 'undefined') return;

  Swal.fire({
    title: '<i class="bi bi-stopwatch-fill" style="color:#4f46e5;"></i> Setel Waktu Jelajah AI',
    html: `
      <div style="text-align: left; font-size: 13px; margin-top: 10px;">
        <p style="color: #64748b; font-size: 12.5px; margin-bottom: 14px;">
          Pilih berapa menit AI Autonomous Explorer akan berjelajah secara otomatis:
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <button type="button" class="btn btn-outline-primary timer-opt-btn" onclick="selectAiTimerOption(5, this)">⚡ 5 Menit</button>
          <button type="button" class="btn btn-primary timer-opt-btn active" onclick="selectAiTimerOption(10, this)">🚀 10 Menit (Default)</button>
          <button type="button" class="btn btn-outline-primary timer-opt-btn" onclick="selectAiTimerOption(15, this)">🛡️ 15 Menit</button>
          <button type="button" class="btn btn-outline-primary timer-opt-btn" onclick="selectAiTimerOption(30, this)">🌐 30 Menit</button>
          <button type="button" class="btn btn-outline-primary timer-opt-btn" onclick="selectAiTimerOption(-1, this)">♾️ Tanpa Batas Waktu</button>
          <button type="button" class="btn btn-outline-primary timer-opt-btn" onclick="selectAiTimerOption(0, this)">✏️ Kustom Menit</button>
        </div>

        <div id="customTimerMinutesGroup" style="display: none; margin-top: 10px;">
          <label class="form-label" style="font-weight: 700;">Masukkan Jumlah Menit Kustom:</label>
          <input type="number" id="customTimerMinutesInput" class="swal2-input" placeholder="Contoh: 45" min="1" max="300" style="width: 100%; margin: 4px 0 0 0;" value="20">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-play-fill"></i> Mulai Penjelajahan AI',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4f46e5',
    didOpen: () => {
      window.selectedTimerMinutes = 10;
    },
    preConfirm: () => {
      let mins = window.selectedTimerMinutes;
      if (mins === 0) {
        const inputVal = parseInt(document.getElementById('customTimerMinutesInput').value, 10);
        if (isNaN(inputVal) || inputVal <= 0) {
          Swal.showValidationMessage('Harap masukkan jumlah menit kustom yang valid!');
          return false;
        }
        mins = inputVal;
      }
      return mins;
    }
  }).then(res => {
    if (res.isConfirmed && res.value !== undefined) {
      const selectedMins = res.value;
      if (selectedMins === -1) {
        isAiTimerUnlimited = true;
        aiExplorerSecondsLeft = 0;
        aiExplorerInitialDurationMinutes = 'Tanpa Batas';
      } else {
        isAiTimerUnlimited = false;
        aiExplorerInitialDurationMinutes = selectedMins;
        aiExplorerSecondsLeft = selectedMins * 60;
      }

      isAiExplorerActive = true;
      initAiAutoExplorerEngine();
      startAiExplorerCountdownTimer();

      const btnHeader = document.getElementById('btnAiExplorerToggleHeader');
      const btnHud = document.getElementById('btnToggleAiExplorer');
      const badge = document.getElementById('aiExplorerStateBadge');

      if (btnHeader) btnHeader.innerHTML = `<i class="bi bi-robot"></i> Jeda Jelajah AI`;
      if (btnHud) btnHud.innerHTML = `<i class="bi bi-pause-fill"></i> Jeda Jelajah AI`;
      if (badge) {
        badge.className = 'badge badge-emerald';
        badge.innerHTML = `<i class="bi bi-record-fill" style="color: #22c55e; animation: blink 1s infinite;"></i> AUTO-SCANNING AKTIF`;
      }

      const durText = isAiTimerUnlimited ? 'Tanpa Batas Waktu' : `${selectedMins} Menit`;
      updateAiLiveLog(`▶️ AI Autonomous Explorer DIAKTIFKAN dengan durasi: ${durText}.`);
      if (typeof showToast === 'function') showToast(`AI Explorer Aktif! Durasi: ${durText}`, 'success');
    }
  });
}

function selectAiTimerOption(mins, btnEl) {
  window.selectedTimerMinutes = mins;
  const container = btnEl.parentElement;
  container.querySelectorAll('.timer-opt-btn').forEach(b => {
    b.classList.remove('btn-primary', 'active');
    b.classList.add('btn-outline-primary');
  });
  btnEl.classList.remove('btn-outline-primary');
  btnEl.classList.add('btn-primary', 'active');

  const customGroup = document.getElementById('customTimerMinutesGroup');
  if (customGroup) {
    customGroup.style.display = mins === 0 ? 'block' : 'none';
  }
}

async function repairAllRecordsAddressWithAi() {
  if (typeof Swal === 'undefined') return;

  // 🔒 STRICT ROLE GUARD: Admin Only
  const currentUserRole = sessionStorage.getItem('ckg_user_role') || (typeof currentRole !== 'undefined' ? currentRole : 'Petugas');
  if (currentUserRole !== 'Admin') {
    Swal.fire({
      title: '🔒 Akses Terbatas (Admin Only)',
      text: 'Maaf, fitur AI Auto-Repair Alamat Rekam Medis ini hanya dapat dijalankan oleh pengguna dengan Peran ADMIN.',
      icon: 'warning',
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#f59e0b'
    });
    return;
  }

  const result = await Swal.fire({
    title: '<i class="bi bi-magic" style="color: #10b981;"></i> Auto-Repair Alamat AI',
    html: `
      <div style="text-align: left; font-size: 13px;">
        <p style="color: #475569; margin-bottom: 10px;">
          Fitur khusus <strong>Admin</strong> ini akan menganalisis teks alamat mentah pada seluruh rekam medis <strong>Data Record CKG / SIMPUS</strong> dan <strong>CKG Sekolah</strong>, lalu secara otomatis memvalidasi & memperbaiki:
        </p>
        <ul style="color: #059669; padding-left: 20px; line-height: 1.6; margin-bottom: 12px; font-weight: 600;">
          <li>Desa / Kelurahan (termasuk koreksi Banjaran Kota ➔ Banjaran Kulon)</li>
          <li>Kecamatan</li>
          <li>Kabupaten / Kota</li>
          <li>Provinsi</li>
        </ul>
        <p style="font-size: 11.5px; color: #64748b; font-style: italic;">
          Hasil perbaikan presisi akan langsung disimpan ke sistem lokal dan disinkronkan ke Cloud D1 Database Server.
        </p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: '✨ Jalankan Auto-Repair AI',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#10b981'
  });

  if (!result.isConfirmed) return;

  // 1. Prepare records list for chunk processing
  const allItems = [];
  if (typeof simpusRecords !== 'undefined' && Array.isArray(simpusRecords)) {
    simpusRecords.forEach((r, idx) => allItems.push({ type: 'simpus', data: r, idx }));
  }
  if (typeof sekolahRecords !== 'undefined' && Array.isArray(sekolahRecords)) {
    sekolahRecords.forEach((r, idx) => allItems.push({ type: 'sekolah', data: r, idx }));
  }

  const totalCount = allItems.length;
  if (totalCount === 0) {
    Swal.fire('Informasi', 'Belum ada data rekam medis SIMPUS atau CKG Sekolah yang tersedia untuk di-audit.', 'info');
    return;
  }

  // 2. Show Live Progress Modal with Animated Progress Bar & Percentage
  Swal.fire({
    title: '<i class="bi bi-cpu-fill" style="color: #3b82f6;"></i> AI Sedang Memeriksa Alamat...',
    html: `
      <div style="text-align: left; font-size: 12.5px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px; color: #1e293b;">
          <span id="aiRepairStatusText">Memulai pemindaian...</span>
          <span id="aiRepairPercentText" style="color: #2563eb;">0%</span>
        </div>

        <div style="height: 16px; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 12px; border: 1px solid #cbd5e1;">
          <div id="aiRepairProgressBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 8px; transition: width 0.15s ease;"></div>
        </div>

        <div style="font-size: 11px; color: #64748b; font-style: italic; text-align: center;">
          Mohon tunggu, AI sedang menyelaraskan hierarki alamat dengan Kamus Administrasi Presisi...
        </div>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false
  });

  let processedCount = 0;
  let simpusFixedCount = 0;
  let sekolahFixedCount = 0;
  const auditLogs = [];

  function processNextChunk(index) {
    if (index >= totalCount) {
      finishRepairProcess();
      return;
    }

    const chunkSize = Math.max(1, Math.floor(totalCount / 40));
    const endIdx = Math.min(index + chunkSize, totalCount);

    for (let i = index; i < endIdx; i++) {
      const item = allItems[i];
      const r = item.data;
      const rawAddr = r.alamat || r.alamat_domisili || '';
      const detected = detectAddressHierarchyFromRawText(rawAddr, r.kelurahan || r.desa, r.kecamatan, r.kab_kota || r.kabupaten, r.provinsi);

      const oldKel = r.kelurahan || r.desa || '-';
      const oldKec = r.kecamatan || '-';
      const oldKab = r.kab_kota || r.kabupaten || '-';
      const oldProv = r.provinsi || '-';

      if (oldKel !== detected.kel || oldKec !== detected.kec || oldKab !== detected.kab || oldProv !== detected.prov) {
        r.kelurahan = detected.kel;
        if (r.desa !== undefined) r.desa = detected.kel;
        r.kecamatan = detected.kec;
        r.kab_kota = detected.kab;
        if (r.kabupaten !== undefined) r.kabupaten = detected.kab;
        r.provinsi = detected.prov;

        if (item.type === 'simpus') {
          simpusFixedCount++;
          auditLogs.push(`[SIMPUS #${r.no || item.idx + 1}] ${r.nama || 'Pasien'}: "${rawAddr}" ➔ Desa: ${oldKel} ➔ <b>${detected.kel}</b>, Kec: ${oldKec} ➔ <b>${detected.kec}</b>`);
        } else {
          sekolahFixedCount++;
          auditLogs.push(`[SEKOLAH #${r.no || item.idx + 1}] ${r.nama || 'Siswa'}: "${rawAddr}" ➔ Desa: ${oldKel} ➔ <b>${detected.kel}</b>, Kec: ${oldKec} ➔ <b>${detected.kec}</b>`);
        }
      }
      processedCount++;
    }

    const pct = Math.round((processedCount / totalCount) * 100);
    const barEl = document.getElementById('aiRepairProgressBar');
    const pctEl = document.getElementById('aiRepairPercentText');
    const statusEl = document.getElementById('aiRepairStatusText');

    if (barEl) barEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (statusEl) statusEl.textContent = `Memeriksa ${processedCount} / ${totalCount} record...`;

    setTimeout(() => processNextChunk(endIdx), 20);
  }

  function finishRepairProcess() {
    if (simpusFixedCount > 0) {
      safeLocalStorageSet('ckg_simpus_records', JSON.stringify(simpusRecords));
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('ckg_simpus_records', simpusRecords);
      if (typeof syncSimpusToCloud === 'function') syncSimpusToCloud(simpusRecords);
    }
    if (sekolahFixedCount > 0) {
      if (typeof CkgIdb !== 'undefined') CkgIdb.set('sekolah_records', sekolahRecords);
      if (typeof syncSekolahRecordsToCloud === 'function') syncSekolahRecordsToCloud(sekolahRecords);
    }

    if (typeof renderSimpusTable === 'function') renderSimpusTable();
    if (typeof renderSekolahTable === 'function') renderSekolahTable();
    if (typeof renderDashboardAnalytics === 'function') renderDashboardAnalytics();

    const totalFixed = simpusFixedCount + sekolahFixedCount;

    let logHtml = auditLogs.length > 0
      ? auditLogs.slice(0, 50).map(l => `<div style="margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px;">${l}</div>`).join('')
      : '<div style="color: #a7f3d0; text-align: center;">Seluruh data rekam medis alamat sudah 100% presisi dan sesuai hierarki administrasi!</div>';

    if (auditLogs.length > 50) {
      logHtml += `<div style="color: #fbbf24; margin-top: 6px; font-weight: 700;">...dan ${auditLogs.length - 50} perbaikan record lainnya.</div>`;
    }

    Swal.fire({
      title: '🎉 Auto-Repair Alamat AI Selesai!',
      html: `
        <div style="text-align: left; font-size: 12.5px; color: #334155;">
          <div style="background: #f1f5f9; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>📊 Total Record Di-audit:</span> <strong>${totalCount} Data</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #059669;">
              <span>✨ Total Record Diperbaiki:</span> <strong>${totalFixed} Data</strong>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
              • SIMPUS / CKG Record: <strong>${simpusFixedCount} diperbaiki</strong><br>
              • CKG Sekolah Record: <strong>${sekolahFixedCount} diperbaiki</strong>
            </div>
          </div>

          <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px;">📋 Rincian Audit Perbaikan Alamat AI:</div>
          <div style="max-height: 180px; overflow-y: auto; background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 10.5px; padding: 8px 10px; border-radius: 8px;">
            ${logHtml}
          </div>
        </div>
      `,
      icon: totalFixed > 0 ? 'success' : 'info',
      confirmButtonText: 'Tutup & Simpan',
      confirmButtonColor: '#10b981'
    });
  }

  // Start process
  processNextChunk(0);
}

function initAiAutoExplorerEngine() {
  if (aiExplorerInterval) clearInterval(aiExplorerInterval);

  aiExplorerInterval = setInterval(() => {
    if (!isAiExplorerActive) return;
    stepAiExplorerNextLocation();
  }, aiScanSpeedMs);

  startAiExplorerCountdownTimer();
  updateAiDbSavedCounterUI();
}

function toggleAiAutoExplorer() {
  if (!checkAdminRoleOnly('Fitur Jelajah AI')) return;

  if (!isAiExplorerActive && (aiExplorerSecondsLeft <= 0 && !isAiTimerUnlimited)) {
    openSetAiTimerModal();
    return;
  }

  isAiExplorerActive = !isAiExplorerActive;

  const btnHeader = document.getElementById('btnAiExplorerToggleHeader');
  const btnHud = document.getElementById('btnToggleAiExplorer');
  const badge = document.getElementById('aiExplorerStateBadge');

  if (isAiExplorerActive) {
    if (btnHeader) btnHeader.innerHTML = `<i class="bi bi-robot"></i> Jeda Jelajah AI`;
    if (btnHud) btnHud.innerHTML = `<i class="bi bi-pause-fill"></i> Jeda Jelajah AI`;
    if (badge) {
      badge.className = 'badge badge-emerald';
      badge.innerHTML = `<i class="bi bi-record-fill" style="color: #22c55e; animation: blink 1s infinite;"></i> AUTO-SCANNING AKTIF`;
    }
    updateAiLiveLog(`▶️ AI Autonomous Explorer DIAKTIFKAN kembali. Menjelajah & mencatat otomatis...`);
    if (typeof showToast === 'function') showToast('AI Auto-Explorer Aktif! Menjelajah lokasi otomatis...', 'success');
  } else {
    if (btnHeader) btnHeader.innerHTML = `<i class="bi bi-play-fill"></i> Mulai Jelajah AI`;
    if (btnHud) btnHud.innerHTML = `<i class="bi bi-play-fill"></i> Mulai Jelajah AI`;
    if (badge) {
      badge.className = 'badge badge-amber';
      badge.innerHTML = `<i class="bi bi-pause-circle-fill"></i> DI-JEDA`;
    }
    updateAiLiveLog(`⏸️ AI Autonomous Explorer di-jeda sementara.`);
    if (typeof showToast === 'function') showToast('AI Auto-Explorer Di-jeda.', 'info');
  }
}

function speedUpAiExplorer() {
  if (!checkAdminRoleOnly('Pengaturan Kecepatan Scanning AI')) return;

  if (aiScanSpeedMs === 4000) {
    aiScanSpeedMs = 2000;
  } else if (aiScanSpeedMs === 2000) {
    aiScanSpeedMs = 800;
  } else {
    aiScanSpeedMs = 4000;
  }

  const speedBtn = document.getElementById('btnSpeedAiExplorer');
  if (speedBtn) {
    if (aiScanSpeedMs === 4000) speedBtn.innerHTML = `<i class="bi bi-lightning-charge-fill" style="color: #f59e0b;"></i> Mode: Normal (4s)`;
    else if (aiScanSpeedMs === 2000) speedBtn.innerHTML = `<i class="bi bi-lightning-charge-fill" style="color: #0284c7;"></i> Mode: Fast (2s)`;
    else speedBtn.innerHTML = `<i class="bi bi-rocket-takeoff-fill" style="color: #ec4899;"></i> Mode: TURBO (0.8s)`;
  }

  initAiAutoExplorerEngine();
  updateAiLiveLog(`⚡ Kecepatan Radar Scanning AI diubah ke interval ${aiScanSpeedMs / 1000}s!`);
}

async function stepAiExplorerNextLocation() {
  const currentRegion = EXPLORATION_REGIONS[aiCurrentRegionIndex] || EXPLORATION_REGIONS[0];
  const regionMap = currentRegion.map;

  if (aiCurrentKecIndex >= regionMap.length) {
    // Current region complete!
    if (aiCurrentRegionIndex < EXPLORATION_REGIONS.length - 1) {
      aiCurrentRegionIndex++;
      aiCurrentKecIndex = 0;
      aiCurrentPointIndex = 0;
      const nextRegion = EXPLORATION_REGIONS[aiCurrentRegionIndex];
      updateAiLiveLog(`🏆 CAKUPAN ${currentRegion.name.toUpperCase()} 100% TERKUASAI! Melanjutkan penjelajahan ke: ${nextRegion.name}`);
      const regLabel = document.getElementById('aiExplorerTargetRegion');
      if (regLabel) regLabel.textContent = nextRegion.name;
    } else {
      // All regions explored!
      aiCurrentRegionIndex = 0;
      aiCurrentKecIndex = 0;
      aiCurrentPointIndex = 0;
      updateAiLiveLog(`🏆 Seluruh Wilayah (${EXPLORATION_REGIONS.length} Region) 100% Terjangkau! Melanjutkan audit siklis...`);
    }
    return;
  }

  const kecObj = regionMap[aiCurrentKecIndex];
  const targetKampung = kecObj.kampungs[aiCurrentPointIndex] || `Kp. ${kecObj.kel}`;

  const cleanKw = targetKampung.replace(/^Kp\.\s*/i, '').trim();
  const targetKel = kecObj.kel;
  const targetKec = kecObj.kec;
  const targetKab = currentRegion.name.includes('Kota') ? 'Kota Bandung' : 'Kabupaten Bandung';
  const targetProv = 'Jawa Barat';

  // Compute fine coordinate offset
  const baseLat = kecObj.coords[0];
  const baseLng = kecObj.coords[1];
  const stepOffsetLat = (aiCurrentPointIndex * 0.0018) * (aiCurrentPointIndex % 2 === 0 ? 1 : -1);
  const stepOffsetLng = (aiCurrentPointIndex * 0.0018) * (aiCurrentPointIndex % 3 === 0 ? 1 : -1);
  const lat = parseFloat((baseLat + stepOffsetLat).toFixed(6));
  const lng = parseFloat((baseLng + stepOffsetLng).toFixed(6));

  // 🔒 SKIP VISITED / ALREADY PINNED CHECK:
  // Match by kampung keyword name ONLY - regardless of kel/kec (which may vary from geocode results)
  const currentLearned = getLearnedKampungMap();
  const isAlreadyPinned = currentLearned.some(item => {
    const itemKw = (Array.isArray(item.keywords) ? item.keywords[0] : item.keywords) || '';
    return String(itemKw).toUpperCase().trim() === cleanKw.toUpperCase();
  });

  if (isAlreadyPinned) {
    // Update HUD to show skipping activity
    updateAiLiveLog(`⏭️ [${new Date().toLocaleTimeString('id-ID')}] Skip: Kp. ${cleanKw} (Desa ${targetKel}, Kec. ${targetKec}) - sudah tercatat`);

    // Advance pointer to next location
    aiCurrentPointIndex++;
    if (aiCurrentPointIndex >= kecObj.kampungs.length) {
      aiCurrentPointIndex = 0;
      aiCurrentKecIndex++;
    }
    // Automatically advance to the next undiscovered location without waiting
    setTimeout(() => {
      if (isAiExplorerActive) stepAiExplorerNextLocation();
    }, 50);
    return;
  }

  // Inform live ticker immediately that AI is actively scanning this coordinate
  updateAiLiveLog(`🔍 [${new Date().toLocaleTimeString('id-ID')}] Sedang memindai: Kp. ${cleanKw} (Desa ${targetKel}, Kec. ${targetKec})...`);

  // 1. Reverse geocode to get accurate address from Dual-API (BigDataCloud + Nominatim)
  let finalKel = targetKel;
  let finalKec = targetKec;
  let finalKab = targetKab;
  let finalProv = targetProv;

  try {
    const geo = await reverseGeocodeNominatim(lat, lng);
    if (geo && geo.kelurahan) finalKel = geo.kelurahan;
    if (geo && geo.kecamatan) finalKec = geo.kecamatan;
    if (geo && geo.kabupaten) finalKab = geo.kabupaten;
    if (geo && geo.provinsi) finalProv = geo.provinsi;
  } catch (geoErr) {
    // Fallback to static exploration map data
  }

  // 2. Auto-record to Cloud D1 database & Local Storage without asking user
  saveLearnedKampungKeyword(
    cleanKw,
    finalKel,
    finalKec,
    finalKab,
    finalProv,
    true,
    lat,
    lng
  );

  aiLearnedCountTotal++;

  // 3. Update Live Log HUD & Indicator with final resolved details
  updateAiLiveLog(`✅ [${new Date().toLocaleTimeString('id-ID')}] Tersimpan D1: Kp. ${cleanKw}, Desa ${finalKel}, Kec. ${finalKec} (${finalKab})`);
  updateAiDbSavedCounterUI();

  // 4. Move Live Radar Marker on Leaflet Map & update popup text
  updateAiRadarMarkerOnMap(lat, lng, cleanKw, finalKec);

  // 5. Update Coverage Progress Bar
  updateAiCoverageProgress(currentRegion);

  // 6. Increment Pointer
  aiCurrentPointIndex++;
  if (aiCurrentPointIndex >= kecObj.kampungs.length) {
    aiCurrentPointIndex = 0;
    aiCurrentKecIndex++;
  }

  // Refresh Map markers dynamically
  if (typeof leafletMap !== 'undefined' && leafletMap) {
    renderMapMarkers();
  }
}

function updateAiRadarMarkerOnMap(lat, lng, kw, kec) {
  if (typeof leafletMap === 'undefined' || !leafletMap || typeof L === 'undefined') return;

  const pointLatLng = [lat, lng];

  if (!aiRadarMarker) {
    const radarIcon = L.divIcon({
      className: 'ai-radar-drone-marker',
      html: `
        <div class="ai-radar-pulse-ring"></div>
        <div class="ai-radar-center-icon"><i class="bi bi-robot"></i></div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });

    aiRadarMarker = L.marker(pointLatLng, { icon: radarIcon, zIndexOffset: 2000 }).addTo(leafletMap);
  } else {
    aiRadarMarker.setLatLng(pointLatLng);
  }

  // Always update popup content with current location info
  const popupHtml = `
    <div style="font-family:'Plus Jakarta Sans',sans-serif; text-align:center; font-size:12px; min-width: 180px;">
      <strong style="color:#0284c7; font-size:13px;">🤖 AI Radar Exploration Agent</strong><br>
      <div style="margin-top: 4px; background: #f0f9ff; border-radius: 6px; padding: 6px 8px; border: 1px solid #bae6fd;">
        <div style="font-size: 11px; color: #64748b;">Sedang memindai & mencatat:</div>
        <div style="font-weight: 800; color: #0f172a; font-size: 13px; margin-top: 2px;">📋 Kp. ${kw}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">Kec. ${kec}</div>
      </div>
    </div>
  `;
  aiRadarMarker.setPopupContent(popupHtml);
  if (!aiRadarMarker.getPopup()) {
    aiRadarMarker.bindPopup(popupHtml);
  }
  if (aiAutoFollowMap && !aiRadarMarker.isPopupOpen()) {
    aiRadarMarker.openPopup();
  }

  // Trajectory line connecting scanned locations
  aiTrajectoryPoints.push(pointLatLng);
  if (aiTrajectoryPoints.length > 25) aiTrajectoryPoints.shift(); // Keep last 25 steps

  if (!aiTrajectoryPolyline) {
    aiTrajectoryPolyline = L.polyline(aiTrajectoryPoints, {
      color: '#38bdf8',
      weight: 3,
      opacity: 0.7,
      dashArray: '6, 8'
    }).addTo(leafletMap);
  } else {
    aiTrajectoryPolyline.setLatLngs(aiTrajectoryPoints);
  }

  if (aiAutoFollowMap) {
    leafletMap.panTo(pointLatLng, { animate: true, duration: 0.8 });
  }
}

function reFocusAiRadarMarker() {
  aiAutoFollowMap = !aiAutoFollowMap;
  if (aiRadarMarker && leafletMap) {
    leafletMap.setView(aiRadarMarker.getLatLng(), 14, { animate: true });
    aiRadarMarker.openPopup();
    showToast(aiAutoFollowMap ? 'Kamera Peta Otomatis Mengikuti AI Drone Radar!' : 'Kamera Otomatis AI Di-nonaktifkan.', 'info');
  } else {
    showToast('Radar AI sedang aktif di peta Kab. Bandung.', 'info');
  }
}

function updateAiLiveLog(msg) {
  const ticker = document.getElementById('aiLiveLogTicker');
  if (ticker) {
    ticker.textContent = msg;
  }
}

function updateAiCoverageProgress(currentRegion) {
  const totalKec = currentRegion.totalKec || 31;
  const currentKecDone = Math.min(aiCurrentKecIndex + 1, totalKec);
  const percent = Math.min(100, Math.round((currentKecDone / totalKec) * 100));

  const textEl = document.getElementById('aiCoverageText');
  const barEl = document.getElementById('aiCoverageBar');
  const labelEl = document.getElementById('aiCoverageRegionLabel');

  if (labelEl) labelEl.textContent = currentRegion.name;
  if (textEl) textEl.textContent = `${percent}% (${currentKecDone}/${totalKec} Kec)`;
  if (barEl) barEl.style.width = `${percent}%`;
}

/* ==========================================================================
   🌐 NOMINATIM REVERSE GEOCODING - SELURUH INDONESIA
   Mendapatkan Desa, Kecamatan, Kab/Kota, Provinsi dari koordinat GPS
   menggunakan OpenStreetMap Nominatim API (gratis, tanpa API key)
   ========================================================================== */

async function reverseGeocodeNominatim(lat, lng) {
  const result = { kampung: '', kelurahan: '', kecamatan: '', kabupaten: '', provinsi: '', displayName: '' };

  // === STRATEGY 1: BigDataCloud (free, excellent Indonesia village/kelurahan data) ===
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`;
    const bdcRes = await fetch(bdcUrl);
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      const adminLevels = bdc.localityInfo?.administrative || [];

      // BigDataCloud admin levels for Indonesia:
      // Level 4 = Provinsi, Level 6 = Kabupaten/Kota, Level 7 = Kecamatan, Level 8 = Desa/Kelurahan
      for (const lv of adminLevels) {
        const name = lv.name || '';
        const order = lv.adminLevel || lv.order || 0;
        if (order === 4 || lv.description === 'state') result.provinsi = result.provinsi || name;
        if (order === 5 || order === 6 || lv.description === 'county' || lv.description === 'regency') result.kabupaten = result.kabupaten || name;
        if (order === 7 || lv.description === 'district') result.kecamatan = result.kecamatan || name;
        if (order === 8 || order === 9 || lv.description === 'village' || lv.description === 'suburb') result.kelurahan = result.kelurahan || name;
      }

      result.kampung = bdc.locality || bdc.localityInfo?.informative?.[0]?.name || result.kelurahan || '';
      result.displayName = bdc.localityInfo?.administrative?.map(a => a.name).reverse().join(', ') || '';

      // If BigDataCloud returned sufficient data, clean & return
      if (result.kelurahan && result.kecamatan) {
        cleanGeoResult(result);
        return result;
      }
    }
  } catch (e) {
    console.warn('BigDataCloud geocode error:', e);
  }

  // === STRATEGY 2: Nominatim fallback (zoom=14 for kecamatan-level accuracy) ===
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=id&zoom=14`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CKG-Puskesmas-App/1.0' }
    });
    if (!res.ok) return result;
    const data = await res.json();
    const addr = data.address || {};

    // Indonesia admin hierarchy (strict order):
    // Kelurahan/Desa: village > suburb
    // Kecamatan: district > city_district
    // Kabupaten/Kota: regency > county > city > municipality
    // Provinsi: state

    if (!result.kelurahan) result.kelurahan = addr.village || addr.suburb || addr.town || '';
    if (!result.kecamatan) result.kecamatan = addr.district || addr.city_district || '';
    if (!result.kabupaten) result.kabupaten = addr.regency || addr.county || addr.city || addr.municipality || '';
    if (!result.provinsi) result.provinsi = addr.state || '';
    if (!result.kampung) result.kampung = addr.hamlet || addr.neighbourhood || addr.quarter || addr.road || result.kelurahan || '';
    if (!result.displayName) result.displayName = data.display_name || '';

  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
  }

  cleanGeoResult(result);
  return result;
}

// Clean common prefixes from Indonesian admin names
function cleanGeoResult(r) {
  const prefixes = ['Kecamatan ', 'Kelurahan ', 'Desa ', 'Kabupaten ', 'Kota Administrasi '];
  prefixes.forEach(p => {
    if (r.kecamatan.startsWith(p)) r.kecamatan = r.kecamatan.replace(p, '');
    if (r.kelurahan.startsWith(p)) r.kelurahan = r.kelurahan.replace(p, '');
    if (r.kampung.startsWith(p)) r.kampung = r.kampung.replace(p, '');
  });
}

function initInteractiveMap() {
  const container = document.getElementById('interactiveMap');
  if (!container) return;

  if (typeof L === 'undefined') {
    console.warn('Leaflet JS library not loaded yet.');
    return;
  }

  // Start Autonomous AI Address Explorer Engine
  initAiAutoExplorerEngine();

  if (!leafletMap) {
    // Center map around Banjaran, Kabupaten Bandung, Jawa Barat
    leafletMap = L.map('interactiveMap', {
      center: [-7.0427, 107.5878],
      zoom: 13,
      zoomControl: true
    });

    // Add Google Maps Tile Layers (Roadmap, Satelit & Jalan, Terrain)
    const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps | Puskesmas Banjaran Kota CKG',
      maxZoom: 20
    });

    const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps Satelit & Jalan | Puskesmas Banjaran Kota CKG',
      maxZoom: 20
    });

    const googleTerrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps Terrain | Puskesmas Banjaran Kota CKG',
      maxZoom: 20
    });

    googleRoadmap.addTo(leafletMap);

    // Layer switcher control for Google Maps views
    L.control.layers({
      '🗺️ Google Maps Standard': googleRoadmap,
      '🛰️ Google Maps Satelit & Jalan': googleSatellite,
      '⛰️ Google Maps Terrain': googleTerrain
    }, null, { position: 'topright' }).addTo(leafletMap);

    mapMarkersGroup = L.layerGroup().addTo(leafletMap);

    // 🌐 Nominatim Reverse Geocoding - Covers ALL Indonesia (Desa, Kecamatan, Kab/Kota, Provinsi)
    // Map click handler to place a pin & auto-resolve accurate address
    leafletMap.on('click', async function (e) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));

      if (currentAddingPinMarker) {
        leafletMap.removeLayer(currentAddingPinMarker);
      }

      currentAddingPinMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-adding-pin',
          html: `<div style="background: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); border: 2px solid white; animation: pulse 1.5s infinite;"><i class="bi bi-geo-alt-fill"></i></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(leafletMap);

      // Auto reverse geocode then open modal with pre-filled data
      const geoResult = await reverseGeocodeNominatim(lat, lng);
      openAddPinModalFromMap(lat, lng, geoResult);
    });
  } else {
    // Invalidate size when view turns active to ensure full tile rendering
    setTimeout(() => leafletMap.invalidateSize(), 200);
  }

  renderMapMarkers();
}

function resetMapFocusToBanjaran() {
  if (leafletMap) {
    leafletMap.setView([-7.0427, 107.5878], 13);
  }
}

function renderMapMarkers() {
  if (!leafletMap || !mapMarkersGroup) return;

  mapMarkersGroup.clearLayers();

  const learnedMap = getLearnedKampungMap();
  const searchVal = (document.getElementById('mapSearchInput')?.value || '').toLowerCase().trim();
  const selectedKec = document.getElementById('mapKecamatanSelect')?.value || '';
  const displayMode = document.getElementById('mapDisplayMode')?.value || 'all';

  const allRecords = (typeof records !== 'undefined' ? records : []).concat(typeof simpusRecords !== 'undefined' ? simpusRecords : []);

  let totalPoints = 0;
  let kecSet = new Set();
  let totalPatientsMapped = 0;
  let banjaranPoints = 0;

  const sidebarListContainer = document.getElementById('mapAddressListContainer');
  if (sidebarListContainer) sidebarListContainer.innerHTML = '';

  learnedMap.forEach((item, index) => {
    const kw = (item.keywords && item.keywords[0]) ? item.keywords[0].toUpperCase() : 'KAMPUNG';
    const kel = item.kel || '';
    const kec = item.kec || '';
    const kab = item.kab || '';
    const prov = item.prov || '';

    // Count patients matched with this address keyword
    const patientCount = allRecords.filter(r => {
      const addr = String(r.alamat || '').toUpperCase();
      return addr.includes(kw) || (item.keywords && item.keywords.some(k => addr.includes(k)));
    }).length;

    // Apply Filters
    if (searchVal && !kw.toLowerCase().includes(searchVal) && !kel.toLowerCase().includes(searchVal) && !kec.toLowerCase().includes(searchVal)) {
      return;
    }

    if (selectedKec && kec.toLowerCase() !== selectedKec.toLowerCase()) {
      return;
    }

    if (displayMode === 'with_patients' && patientCount === 0) {
      return;
    }

    // Determine Lat / Lng coordinates
    let lat = item.lat ? Number(item.lat) : null;
    let lng = item.lng ? Number(item.lng) : null;

    if (!lat || !lng) {
      // Look up fallback coordinates in Kabupaten Bandung map dictionary
      const lookupKey = kw.toUpperCase();
      const kelLookupKey = kel.toUpperCase();

      if (KAB_BANDUNG_COORDS_MAP[lookupKey]) {
        [lat, lng] = KAB_BANDUNG_COORDS_MAP[lookupKey];
      } else if (KAB_BANDUNG_COORDS_MAP[kelLookupKey]) {
        [lat, lng] = KAB_BANDUNG_COORDS_MAP[kelLookupKey];
      } else {
        // Pseudo offset around Banjaran center for unanchored kampungs
        const hash = kw.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const offsetLat = ((hash % 100) - 50) * 0.0008;
        const offsetLng = (((hash * 7) % 100) - 50) * 0.0008;
        lat = -7.0427 + offsetLat;
        lng = 107.5878 + offsetLng;
      }
    }

    totalPoints++;
    if (kec) kecSet.add(kec);
    totalPatientsMapped += patientCount;
    if (kec.toLowerCase() === 'banjaran') banjaranPoints++;

    // Custom Marker Badge Icon
    const markerColor = patientCount > 5 ? '#059669' : (patientCount > 0 ? '#2563eb' : '#0284c7');
    const markerHtml = `
      <div style="background: ${markerColor}; color: white; border-radius: 20px; padding: 4px 10px; font-weight: 800; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white; white-space: nowrap; cursor: pointer;">
        <i class="bi bi-geo-alt-fill"></i> ${kw} ${patientCount > 0 ? `<span style="background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 10px; font-size: 10px;">${patientCount}</span>` : ''}
      </div>
    `;

    const markerIcon = L.divIcon({
      className: 'custom-map-address-marker',
      html: markerHtml,
      iconAnchor: [30, 15]
    });

    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(mapMarkersGroup);

    // Popup Content
    const popupContent = `
      <div style="min-width: 220px; font-family: 'Plus Jakarta Sans', sans-serif;">
        <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
          <span>📋 ${kw}</span>
          <span style="font-size: 10px; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 10px; font-weight: 700;">${kec}</span>
        </div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 8px;">
          <strong>Desa/Kel:</strong> ${kel}<br>
          <strong>Kecamatan:</strong> ${kec}<br>
          <strong>Kab/Kota:</strong> ${kab}<br>
          <strong>Provinsi:</strong> ${prov}<br>
          <strong>Koordinat:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span style="color: #64748b; font-weight: 600;">Jumlah Pasien CKG:</span>
          <strong style="color: #2563eb; font-size: 13px;">${patientCount} Pasien</strong>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-primary btn-sm" style="flex: 1; font-size: 11px;" onclick="prefillFormWithAddress('${kw}', '${kel}', '${kec}')">
            <i class="bi bi-plus-circle"></i> Input CKG
          </button>
          <button class="btn btn-secondary btn-sm" style="font-size: 11px;" onclick="deleteAddressPin('${kw}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);

    // Sidebar card entry
    if (sidebarListContainer) {
      const cardEl = document.createElement('div');
      cardEl.className = 'map-address-card';
      cardEl.onclick = () => {
        leafletMap.setView([lat, lng], 15);
        marker.openPopup();
        document.querySelectorAll('.map-address-card').forEach(c => c.classList.remove('active'));
        cardEl.classList.add('active');
      };

      cardEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${kw}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 1px;">
              ${kel}${kec ? ', Kec. ' + kec : ''}${kab ? ', ' + kab : ''}
            </div>
          </div>
          <span class="badge ${patientCount > 0 ? 'badge-emerald' : 'badge-cyan'}" style="font-size: 10px;">
            ${patientCount} Pasien
          </span>
        </div>
      `;
      sidebarListContainer.appendChild(cardEl);
    }
  });

  // Update Stat Pills
  const totalPointsEl = document.getElementById('mapStatTotalPoints');
  const totalKecEl = document.getElementById('mapStatTotalKec');
  const totalPatientsEl = document.getElementById('mapStatTotalPatients');
  const banjaranPointsEl = document.getElementById('mapStatBanjaranPoints');
  const sidebarBadgeEl = document.getElementById('mapSidebarCountBadge');

  if (totalPointsEl) totalPointsEl.textContent = `${totalPoints} Titik`;
  if (totalKecEl) totalKecEl.textContent = `${kecSet.size} Kec`;
  if (totalPatientsEl) totalPatientsEl.textContent = `${totalPatientsMapped} Pasien`;
  if (banjaranPointsEl) banjaranPointsEl.textContent = `${banjaranPoints} Titik`;
  if (sidebarBadgeEl) sidebarBadgeEl.textContent = `${totalPoints} Titik`;
}

function filterMapMarkers() {
  renderMapMarkers();
}

async function deleteAddressPin(kw) {
  if (!checkAdminRoleOnly('Penghapusan Titik Alamat')) return;

  const confirm = await Swal.fire({
    title: 'Hapus Titik Alamat?',
    text: `Apakah Anda yakin ingin menghapus titik kampung "${kw}" dari Kamus Alamat (Lokal & Cloud D1)?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Titik',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#e11d48'
  });

  if (!confirm.isConfirmed) return;

  // 1. Remove from local storage
  let localList = typeof getLearnedKampungMap === 'function' ? getLearnedKampungMap() : [];
  const cleanKw = String(kw).toUpperCase().replace(/^KP\.\s*/i, '').trim();
  localList = localList.filter(l => {
    const lKw = (Array.isArray(l.keywords) ? l.keywords[0] : l.keywords) || '';
    return String(lKw).toUpperCase().trim() !== cleanKw;
  });
  localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(localList));

  // 2. Delete from D1 Cloud Server
  try {
    await fetch(`/api/kamus?keyword=${encodeURIComponent(cleanKw)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Delete keyword D1 error:', err);
  }

  // 3. Refresh UI
  if (typeof updateAiDbSavedCounterUI === 'function') updateAiDbSavedCounterUI();
  if (typeof renderMapMarkers === 'function') renderMapMarkers();
  if (typeof showToast === 'function') showToast(`Titik "${kw}" berhasil dihapus.`, 'success');
}

async function resetAllAddressPinsWithAi() {
  if (!checkAdminRoleOnly('Reset Semua Titik Alamat')) return;

  if (typeof Swal === 'undefined') return;

  // Count current local data for progress reference
  const currentLocal = (() => {
    try { return JSON.parse(localStorage.getItem('ckg_learned_kampung_map') || '[]'); } catch (e) { return []; }
  })();

  const result = await Swal.fire({
    title: '⚠️ Reset & Hapus Seluruh Titik Alamat?',
    html: `
      <div style="text-align: left; font-size: 13px; color: #334155;">
        <p style="color: #e11d48; font-weight: 700; margin-bottom: 8px;">
          PERHATIAN: Tindakan ini akan menghapus SELURUH titik kamus alamat tersimpan di:
        </p>
        <ul style="line-height: 1.6; padding-left: 20px; color: #64748b; margin-bottom: 10px; font-weight: 600;">
          <li>💾 Storage Lokal Browser - <strong style="color: #e11d48;">${currentLocal.length} Titik</strong></li>
          <li>☁️ Cloud D1 Database Server - <strong style="color: #e11d48;">Tabel kamus_alamat</strong></li>
        </ul>
        <p style="font-size: 12px; color: #475569;">
          Setelah di-reset, status penjelajahan AI Autonomous Explorer akan dikembalikan ke awal (0 Titik) sehingga pemindaian dapat dimulai dari nol.
        </p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '🗑️ Ya, Reset Semua Titik',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b'
  });

  if (!result.isConfirmed) return;

  // ====== SHOW REAL-TIME PROGRESS POPUP ======
  const progressSteps = [
    { label: '🔍 Menghitung data Cloud D1...', pct: 5 },
    { label: '☁️ Menghapus data Cloud D1 Database...', pct: 25 },
    { label: '✅ Memverifikasi penghapusan Cloud D1...', pct: 50 },
    { label: '💾 Membersihkan Storage Lokal Browser...', pct: 65 },
    { label: '🤖 Mereset AI Autonomous Explorer...', pct: 80 },
    { label: '🗺️ Memperbarui Peta & UI...', pct: 92 },
    { label: '✨ Reset Selesai!', pct: 100 }
  ];

  Swal.fire({
    title: '🔄 Reset Titik Alamat Sedang Berlangsung...',
    html: `
      <div id="resetProgressContainer" style="text-align: left; font-size: 13px; padding-top: 6px;">
        <div id="resetProgressStep" style="font-weight: 700; color: #0284c7; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          <span class="spinner-border spinner-border-sm" style="width: 16px; height: 16px; border-width: 2px; color: #0284c7;"></span>
          <span>Memulai proses reset...</span>
        </div>
        <div style="height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
          <div id="resetProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0284c7); border-radius: 6px; transition: width 0.4s ease;"></div>
        </div>
        <div id="resetProgressLog" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-family: monospace; font-size: 11.5px; color: #475569; max-height: 160px; overflow-y: auto; line-height: 1.7;">
          <div>⏳ Menginisialisasi proses reset...</div>
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-weight: 600;">
          <span>Lokal: <strong id="resetLocalCount" style="color: #e11d48;">${currentLocal.length} Titik</strong></span>
          <span>Cloud D1: <strong id="resetCloudCount" style="color: #e11d48;">Menghitung...</strong></span>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => { Swal.showLoading(); }
  });

  const updateProgress = (step, extraLog = '') => {
    const barEl = document.getElementById('resetProgressBar');
    const stepEl = document.getElementById('resetProgressStep');
    const logEl = document.getElementById('resetProgressLog');
    if (barEl) barEl.style.width = step.pct + '%';
    if (stepEl) stepEl.querySelector('span:last-child').textContent = step.label;
    if (logEl && extraLog) {
      logEl.innerHTML += `<div>${extraLog}</div>`;
      logEl.scrollTop = logEl.scrollHeight;
    }
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    // --- STEP 1: Count Cloud D1 Records ---
    updateProgress(progressSteps[0], '🔍 Mengecek jumlah record di Cloud D1 Database...');
    await delay(500);

    let cloudCount = '?';
    try {
      const countRes = await fetch('/api/kamus');
      if (countRes.ok) {
        const countData = await countRes.json();
        cloudCount = (countData.data && Array.isArray(countData.data)) ? countData.data.length : 0;
      }
    } catch (e) { cloudCount = 'Error'; }

    const cloudCountEl = document.getElementById('resetCloudCount');
    if (cloudCountEl) cloudCountEl.textContent = cloudCount + ' Titik';

    updateProgress(progressSteps[0], `✅ Cloud D1: Ditemukan <strong style="color: #e11d48;">${cloudCount} record</strong> yang akan dihapus.`);
    await delay(400);

    // --- STEP 2: Delete all from Cloud D1 ---
    updateProgress(progressSteps[1], '☁️ Mengirim perintah DELETE ke Cloud D1 Server...');
    await delay(300);

    let deleteSuccess = false;
    try {
      const delRes = await fetch('/api/kamus', { method: 'DELETE' });
      if (delRes.ok) {
        const delData = await delRes.json();
        deleteSuccess = delData.success === true;
        updateProgress(progressSteps[1], `☁️ Server merespon: ${delData.message || 'OK'} (success: ${deleteSuccess})`);
      } else {
        updateProgress(progressSteps[1], `⚠️ Server merespon HTTP ${delRes.status}. Mencoba lanjut...`);
      }
    } catch (err) {
      updateProgress(progressSteps[1], `❌ Gagal koneksi ke Cloud D1: ${err.message}`);
    }
    await delay(500);

    // --- STEP 3: Verify cloud deletion ---
    updateProgress(progressSteps[2], '🔍 Memverifikasi penghapusan di Cloud D1...');
    await delay(400);

    let verifiedCount = '?';
    try {
      const verifyRes = await fetch('/api/kamus');
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        verifiedCount = (verifyData.data && Array.isArray(verifyData.data)) ? verifyData.data.length : 0;
      }
    } catch (e) { verifiedCount = 'Error'; }

    if (cloudCountEl) cloudCountEl.textContent = verifiedCount + ' Titik';

    if (verifiedCount === 0) {
      updateProgress(progressSteps[2], `✅ Verifikasi berhasil: Cloud D1 sekarang kosong (0 record).`);
    } else {
      updateProgress(progressSteps[2], `⚠️ Verifikasi: Cloud D1 masih memiliki ${verifiedCount} record. Mungkin membutuhkan waktu propagasi.`);
    }
    await delay(400);

    // --- STEP 4: Clear LocalStorage ---
    updateProgress(progressSteps[3], '💾 Menghapus data lokal browser...');
    await delay(300);

    localStorage.removeItem('ckg_learned_kampung_map');
    localStorage.removeItem('ckg_deleted_kampungs_blacklist');
    localStorage.setItem('ckg_dictionary_is_reset', 'true');

    const localCountEl = document.getElementById('resetLocalCount');
    if (localCountEl) localCountEl.textContent = '0 Titik';

    updateProgress(progressSteps[3], `✅ LocalStorage dibersihkan: ckg_learned_kampung_map, blacklist, dan flag reset ditetapkan.`);
    await delay(400);

    // --- STEP 5: Reset AI Autonomous Explorer State ---
    updateProgress(progressSteps[4], '🤖 Mereset state AI Autonomous Explorer...');
    await delay(300);

    isAiExplorerActive = false;
    if (aiExplorerInterval) clearInterval(aiExplorerInterval);
    aiCurrentRegionIndex = 0;
    aiCurrentKecIndex = 0;
    aiCurrentPointIndex = 0;
    aiTrajectoryPoints = [];

    if (aiTrajectoryPolyline && leafletMap) {
      leafletMap.removeLayer(aiTrajectoryPolyline);
      aiTrajectoryPolyline = null;
    }
    if (aiRadarMarker && leafletMap) {
      leafletMap.removeLayer(aiRadarMarker);
      aiRadarMarker = null;
    }

    updateProgress(progressSteps[4], `✅ AI Explorer: Region/Kec/Point index di-reset ke 0, trajectory & radar dihapus.`);
    await delay(400);

    // --- STEP 6: Refresh UI ---
    updateProgress(progressSteps[5], '🗺️ Memperbarui tampilan peta dan badge...');
    await delay(300);

    if (typeof updateAiDbSavedCounterUI === 'function') updateAiDbSavedCounterUI();
    if (typeof renderMapMarkers === 'function') renderMapMarkers();

    const btnHeader = document.getElementById('btnAiExplorerToggleHeader');
    const btnHud = document.getElementById('btnToggleAiExplorer');
    const badge = document.getElementById('aiExplorerStateBadge');

    if (btnHeader) btnHeader.innerHTML = `<i class="bi bi-play-fill"></i> Mulai Jelajah AI`;
    if (btnHud) btnHud.innerHTML = `<i class="bi bi-play-fill"></i> Mulai Jelajah AI`;
    if (badge) {
      badge.className = 'badge badge-amber';
      badge.innerHTML = `<i class="bi bi-pause-circle-fill"></i> DI-JEDA`;
    }

    if (typeof updateAiLiveLog === 'function') {
      updateAiLiveLog(`🔄 Seluruh titik kamus alamat berhasil di-reset ke 0. Siap untuk scan dari nol.`);
    }

    updateProgress(progressSteps[5], `✅ Peta, sidebar, dan badge UI berhasil diperbarui.`);
    await delay(500);

    // --- STEP 7: Done! ---
    updateProgress(progressSteps[6], `🎉 Proses reset selesai! Lokal: 0 titik | Cloud D1: ${verifiedCount} record.`);
    await delay(600);

    // Close progress and show success
    Swal.fire({
      title: '✨ Reset Berhasil!',
      html: `
        <div style="text-align: left; font-size: 13px; color: #334155;">
          <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 10px; padding: 12px 16px; margin-bottom: 12px;">
            <div style="font-weight: 800; color: #059669; margin-bottom: 6px;">📊 Laporan Reset:</div>
            <div style="font-size: 12px; line-height: 1.8; color: #047857;">
              💾 Lokal: <strong>${currentLocal.length} ➔ 0 titik</strong> (dihapus)<br>
              ☁️ Cloud D1: <strong>${cloudCount} ➔ ${verifiedCount} record</strong> (${verifiedCount === 0 ? 'berhasil dikosongkan' : 'dalam proses propagasi'})<br>
              🤖 AI Explorer: <strong>Status di-reset ke awal</strong>
            </div>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Penjelajahan AI siap dimulai dari nol. Klik <strong>"Mulai Jelajah AI"</strong> untuk memulai scan baru.
          </p>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'OK, Selesai',
      confirmButtonColor: '#10b981'
    });

  } catch (e) {
    console.error('Error reset all pins:', e);
    Swal.fire({
      title: '❌ Reset Gagal',
      text: `Terjadi kesalahan: ${e.message}`,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#e11d48'
    });
  }
}

function openAddPinModalFromMap(lat = null, lng = null, geoResult = null) {
  if (!checkAdminRoleOnly('Penambahan Titik Alamat Manual')) return;

  const defaultLat = lat || -7.0427;
  const defaultLng = lng || 107.5878;

  // Pre-fill from Nominatim reverse geocode result if available
  const geoKampung = geoResult ? (geoResult.kampung || '') : '';
  const geoKel = geoResult ? (geoResult.kelurahan || '') : '';
  const geoKec = geoResult ? (geoResult.kecamatan || '') : '';
  const geoKab = geoResult ? (geoResult.kabupaten || '') : '';
  const geoProv = geoResult ? (geoResult.provinsi || '') : '';
  const geoDisplay = geoResult ? (geoResult.displayName || '') : '';

  Swal.fire({
    title: '<i class="bi bi-geo-alt-fill" style="color:#0284c7;"></i> Catat Titik Alamat di Peta',
    html: `
      <div style="text-align: left; font-size: 13px; margin-top: 10px;">
        <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">
          Alamat otomatis terdeteksi dari lokasi peta (<strong>Seluruh Indonesia</strong>). Koreksi jika perlu.
        </p>

        ${geoDisplay ? `
        <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 8px 12px; font-size: 11.5px; color: #047857; font-weight: 600; margin-bottom: 12px; word-break: break-word;">
          <i class="bi bi-check-circle-fill" style="color: #10b981;"></i> Nominatim: ${geoDisplay}
        </div>
        ` : `
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px 12px; font-size: 11.5px; color: #92400e; font-weight: 600; margin-bottom: 12px;">
          <i class="bi bi-exclamation-triangle-fill" style="color: #f59e0b;"></i> Alamat otomatis tidak tersedia. Silakan isi manual.
        </div>
        `}

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label">Nama Kampung / Keyword Alamat <span class="required">*</span></label>
          <input type="text" id="swalMapKw" class="swal2-input" placeholder="Contoh: Kp. Pajagalan / Kp. Ciapus" style="width: 100%; margin: 4px 0 0 0;" value="${geoKampung}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="form-group">
            <label class="form-label">Kelurahan / Desa <span class="required">*</span></label>
            <input type="text" id="swalMapKel" class="swal2-input" placeholder="Nama Desa / Kelurahan" style="width: 100%; margin: 4px 0 0 0;" value="${geoKel}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Kecamatan <span class="required">*</span></label>
            <input type="text" id="swalMapKec" class="swal2-input" placeholder="Nama Kecamatan" style="width: 100%; margin: 4px 0 0 0; font-weight: 700;" value="${geoKec}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="form-group">
            <label class="form-label">Kabupaten / Kota</label>
            <input type="text" id="swalMapKab" class="swal2-input" placeholder="Kab. / Kota" style="width: 100%; margin: 4px 0 0 0; font-weight: 700;" value="${geoKab}">
          </div>
          <div class="form-group">
            <label class="form-label">Provinsi</label>
            <input type="text" id="swalMapProv" class="swal2-input" placeholder="Provinsi" style="width: 100%; margin: 4px 0 0 0; font-weight: 700;" value="${geoProv}">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">Latitude</label>
            <input type="number" id="swalMapLat" class="swal2-input" value="${defaultLat}" step="any" style="width: 100%; margin: 4px 0 0 0;" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Longitude</label>
            <input type="number" id="swalMapLng" class="swal2-input" value="${defaultLng}" step="any" style="width: 100%; margin: 4px 0 0 0;" readonly>
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-lg"></i> Simpan Titik Alamat',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#0284c7',
    width: 560,
    didOpen: () => {
      const kwEl = document.getElementById('swalMapKw');
      const kelEl = document.getElementById('swalMapKel');
      const kecEl = document.getElementById('swalMapKec');
      const latEl = document.getElementById('swalMapLat');
      const lngEl = document.getElementById('swalMapLng');
      if (kwEl) {
        attachGoogleMapsAddressAutocomplete(kwEl, kelEl, kecEl, latEl, lngEl);
      }
    },
    preConfirm: () => {
      const kw = document.getElementById('swalMapKw').value.trim();
      const kel = document.getElementById('swalMapKel').value.trim();
      const kec = document.getElementById('swalMapKec').value.trim();
      const kab = document.getElementById('swalMapKab').value.trim();
      const prov = document.getElementById('swalMapProv').value.trim();
      const latVal = parseFloat(document.getElementById('swalMapLat').value);
      const lngVal = parseFloat(document.getElementById('swalMapLng').value);

      if (!kw || !kel) {
        Swal.showValidationMessage('Harap isi Nama Kampung dan Kelurahan!');
        return false;
      }
      return { kw, kel, kec, kab, prov, lat: latVal, lng: lngVal };
    }
  }).then((res) => {
    if (currentAddingPinMarker && leafletMap) {
      leafletMap.removeLayer(currentAddingPinMarker);
      currentAddingPinMarker = null;
    }

    if (res.isConfirmed && res.value) {
      const { kw, kel, kec, kab, prov, lat: pLat, lng: pLng } = res.value;
      saveLearnedKampungKeyword(kw, kel, kec, kab || 'Kabupaten Bandung', prov || 'Jawa Barat', true, pLat, pLng);
      showToast(`Titik Alamat "${kw}" Berhasil Dicatat! (${kel}, ${kec}, ${kab})`, 'success');
      renderMapMarkers();
    }
  });
}

function prefillFormWithAddress(kw, kel, kec) {
  switchView('data-records');
  setTimeout(() => {
    const alamatEl = document.getElementById('alamat');
    const kelEl = document.getElementById('kelurahan');
    const kecEl = document.getElementById('kecamatan');

    if (alamatEl) alamatEl.value = `Kp. ${kw}`;
    if (kelEl) kelEl.value = kel;
    if (kecEl) kecEl.value = kec;

    showToast(`Form diisi dengan lokasi: Kp. ${kw}, ${kel}`, 'info');
  }, 200);
}

function deleteAddressPin(kw) {
  if (!kw) return;
  const cleanKw = String(kw).toUpperCase().trim();

  Swal.fire({
    title: 'Hapus Titik Alamat?',
    text: `Titik alamat "${cleanKw}" akan dihapus secara permanen dari Peta & Database Cloud D1.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Permanen!',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626'
  }).then(async (res) => {
    if (res.isConfirmed) {
      // 1. Add to blacklist to prevent restoration on refresh
      addToDeletedBlacklist(cleanKw);

      // 2. Remove from local storage map cache
      const raw = localStorage.getItem('ckg_learned_kampung_map');
      if (raw) {
        try {
          const list = JSON.parse(raw);
          const filtered = list.filter(item => {
            if (Array.isArray(item.keywords)) {
              return !item.keywords.some(k => String(k).toUpperCase().trim() === cleanKw);
            }
            return String(item.keywords).toUpperCase().trim() !== cleanKw;
          });
          localStorage.setItem('ckg_learned_kampung_map', JSON.stringify(filtered));
        } catch (e) { }
      }

      // 3. Delete from Cloudflare D1 Cloud Server
      try {
        await fetch(`/api/kamus?keyword=${encodeURIComponent(cleanKw)}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('D1 pin delete error:', err);
      }

      showToast(`Titik alamat "${cleanKw}" berhasil dihapus secara permanen.`, 'success');
      refreshAdminKamusStats();
      if (typeof renderMapMarkers === 'function') renderMapMarkers();
    }
  });
}

// ==========================================================================
// 📋 GOOGLE MAPS STYLE ADDRESS AUTOCOMPLETE SUGGESTIONS
// ==========================================================================

let autocompleteDebounceTimer = null;

function attachGoogleMapsAddressAutocomplete(kwInput, kelInput, kecSelect, latInput, lngInput) {
  if (!kwInput) return;

  let wrapper = kwInput.parentElement;
  if (!wrapper.classList.contains('address-autocomplete-wrapper')) {
    const parent = kwInput.parentNode;
    wrapper = document.createElement('div');
    wrapper.className = 'address-autocomplete-wrapper';
    parent.insertBefore(wrapper, kwInput);
    wrapper.appendChild(kwInput);
  }

  let dropdown = wrapper.querySelector('.address-autocomplete-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'address-autocomplete-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);
  }

  const closeDropdown = () => {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  };

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown();
    }
  });

  kwInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toUpperCase();
    if (query.length < 2) {
      closeDropdown();
      return;
    }

    clearTimeout(autocompleteDebounceTimer);
    autocompleteDebounceTimer = setTimeout(async () => {
      const suggestions = [];
      const addedSet = new Set();

      // 1. Local & D1 Learned Kampung Map
      const learnedMap = getLearnedKampungMap();
      learnedMap.forEach(item => {
        const kw = (item.keywords && item.keywords[0]) ? item.keywords[0].toUpperCase() : '';
        if (kw && kw.includes(query) && !addedSet.has(kw)) {
          addedSet.add(kw);
          suggestions.push({
            title: `Kp. ${kw}`,
            kw: kw,
            kel: item.kel || '',
            kec: item.kec || '',
            kab: item.kab || '',
            lat: item.lat ? Number(item.lat) : null,
            lng: item.lng ? Number(item.lng) : null,
            source: 'Kamus D1 / Peta'
          });
        }
      });

      // 2. Kab. Bandung Coordinates Map
      Object.keys(KAB_BANDUNG_COORDS_MAP).forEach(k => {
        if (k.includes(query) && !addedSet.has(k)) {
          addedSet.add(k);
          const coords = KAB_BANDUNG_COORDS_MAP[k];
          suggestions.push({
            title: `Kp. ${k}`,
            kw: k,
            kel: k.includes('BANJARAN') ? 'Banjaran Kota' : (k.includes('CANGKUANG') ? 'Cangkuang' : k),
            kec: 'Banjaran',
            lat: coords[0],
            lng: coords[1],
            source: 'Kabupaten Bandung'
          });
        }
      });

      // 3. LocationIQ High-Precision Autocomplete Engine (Free 5,000 req/day API)
      if (suggestions.length < 6) {
        try {
          const locIqKey = 'pk.87f2b960c1d68379ba5189288e7343e0';
          const locIqUrl = `https://api.locationiq.com/v1/autocomplete?key=${locIqKey}&q=${encodeURIComponent(query + ' Indonesia')}&limit=6&countrycodes=id&format=json`;
          const res = await fetch(locIqUrl);
          if (res.ok) {
            const data = await res.json();
            data.forEach(place => {
              const addr = place.address || {};
              const village = addr.village || addr.quarter || addr.hamlet || addr.suburb || addr.neighbourhood || addr.road || place.display_name.split(',')[0];
              const kwClean = village.toUpperCase().replace(/^(KP\.|KAMPUNG|DESA|KELURAHAN|JALAN|JLN?\.)\s*/gi, '').trim();
              const kecFound = addr.town || addr.district || addr.suburb || addr.city_district || '';
              const kelFound = addr.village || addr.quarter || addr.suburb || kwClean;
              const kabFound = addr.regency || addr.county || addr.city || '';

              if (kwClean && !addedSet.has(kwClean)) {
                addedSet.add(kwClean);
                suggestions.push({
                  title: `Kp. ${kwClean}`,
                  kw: kwClean,
                  kel: kelFound,
                  kec: kecFound,
                  kab: kabFound,
                  lat: parseFloat(place.lat),
                  lng: parseFloat(place.lon),
                  source: 'LocationIQ'
                });
              }
            });
          }
        } catch (err) {
          console.warn('LocationIQ Autocomplete error:', err);
        }
      }

      // 4. OpenStreetMap Nominatim Fallback
      if (suggestions.length < 6) {
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Indonesia')}&format=json&addressdetails=1&countrycodes=id&limit=6`;
          const res = await fetch(osmUrl);
          if (res.ok) {
            const data = await res.json();
            data.forEach(place => {
              const addr = place.address || {};
              const village = addr.village || addr.quarter || addr.hamlet || addr.suburb || addr.neighbourhood || place.display_name.split(',')[0];
              const kwClean = village.toUpperCase().replace(/^(KP\.|KAMPUNG|DESA|KELURAHAN|JALAN|JLN?\.)\s*/gi, '').trim();
              const kecFound = addr.town || addr.district || addr.suburb || addr.city_district || '';
              const kabFound = addr.regency || addr.county || addr.city || '';
              if (kwClean && !addedSet.has(kwClean)) {
                addedSet.add(kwClean);
                suggestions.push({
                  title: `Kp. ${kwClean}`,
                  kw: kwClean,
                  kel: addr.village || addr.quarter || kwClean,
                  kec: kecFound,
                  kab: kabFound,
                  lat: parseFloat(place.lat),
                  lng: parseFloat(place.lon),
                  source: 'Nominatim OSM'
                });
              }
            });
          }
        } catch (err) { }
      }

      if (suggestions.length === 0) {
        closeDropdown();
        return;
      }

      dropdown.innerHTML = suggestions.slice(0, 6).map((s, idx) => `
        <div class="address-autocomplete-item" data-idx="${idx}">
          <div class="icon-box">
            <i class="bi bi-geo-alt-fill"></i>
          </div>
          <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${s.title}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
              Desa ${s.kel}${s.kec ? ', Kec. ' + s.kec : ''}${s.kab ? ', ' + s.kab : ''}
            </div>
          </div>
          <span style="font-size: 10px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 10px; font-weight: 700; flex-shrink: 0;">
            ${s.source}
          </span>
        </div>
      `).join('');

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.address-autocomplete-item').forEach(el => {
        el.onclick = (event) => {
          event.stopPropagation();
          const idx = parseInt(el.getAttribute('data-idx'));
          const selected = suggestions[idx];

          if (selected) {
            kwInput.value = selected.title;
            if (kelInput) kelInput.value = selected.kel;

            if (kecSelect) {
              const options = Array.from(kecSelect.options);
              const match = options.find(opt => opt.text.toLowerCase().includes(selected.kec.toLowerCase()) || opt.value.toLowerCase().includes(selected.kec.toLowerCase()));
              if (match) kecSelect.value = match.value;
            }

            if (latInput && selected.lat) latInput.value = selected.lat.toFixed(6);
            if (lngInput && selected.lng) lngInput.value = selected.lng.toFixed(6);

            // Update pin marker on map if active
            if (typeof leafletMap !== 'undefined' && leafletMap && selected.lat && selected.lng) {
              leafletMap.setView([selected.lat, selected.lng], 16);
              if (typeof currentAddingPinMarker !== 'undefined' && currentAddingPinMarker) {
                currentAddingPinMarker.setLatLng([selected.lat, selected.lng]);
              }
            }
          }

          closeDropdown();
        };
      });
    }, 250);
  });
}

// Attach autocomplete to CKG Record Form Alamat field on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const mainAlamatEl = document.getElementById('alamat');
    const mainKelEl = document.getElementById('kelurahan');
    const mainKecEl = document.getElementById('kecamatan');
    if (mainAlamatEl) {
      attachGoogleMapsAddressAutocomplete(mainAlamatEl, mainKelEl, mainKecEl, null, null);
    }
  }, 1000);
});
