/**
 * Pharmaceutical constants — enumerations used across the product domain
 * to classify medicines and pharmaceutical products.
 */

// ---------------------------------------------------------------------------
// Dosage form — physical form of the medication
// ---------------------------------------------------------------------------
export enum DosageForm {
  // Solid oral forms
  TABLET = 'tablet',
  TABLET_EFFERVESCENT = 'tablet_effervescent',
  TABLET_CHEWABLE = 'tablet_chewable',
  TABLET_SUBLINGUAL = 'tablet_sublingual',
  TABLET_BUCCAL = 'tablet_buccal',
  TABLET_EXTENDED_RELEASE = 'tablet_extended_release',
  TABLET_DISPERSIBLE = 'tablet_dispersible',
  CAPSULE = 'capsule',
  CAPSULE_EXTENDED_RELEASE = 'capsule_extended_release',
  CAPSULE_ENTERIC_COATED = 'capsule_enteric_coated',
  POWDER = 'powder',
  GRANULE = 'granule',
  PELLET = 'pellet',
  LOZENGE = 'lozenge',
  TROCHE = 'troche',

  // Liquid oral forms
  SOLUTION = 'solution',
  SUSPENSION = 'suspension',
  SYRUP = 'syrup',
  ELIXIR = 'elixir',
  EMULSION = 'emulsion',
  DROPS = 'drops',

  // Injectable forms
  INJECTION_SOLUTION = 'injection_solution',
  INJECTION_SUSPENSION = 'injection_suspension',
  INJECTION_POWDER = 'injection_powder',
  INFUSION = 'infusion',
  IMPLANT = 'implant',

  // Topical forms
  CREAM = 'cream',
  OINTMENT = 'ointment',
  GEL = 'gel',
  LOTION = 'lotion',
  PATCH = 'patch',
  FOAM = 'foam',
  SPRAY_TOPICAL = 'spray_topical',

  // Inhaled forms
  AEROSOL = 'aerosol',
  INHALER = 'inhaler',
  NEBULIZER_SOLUTION = 'nebulizer_solution',
  POWDER_INHALER = 'powder_inhaler',

  // Ophthalmic / otic / nasal
  EYE_DROPS = 'eye_drops',
  EYE_OINTMENT = 'eye_ointment',
  EAR_DROPS = 'ear_drops',
  NASAL_DROPS = 'nasal_drops',
  NASAL_SPRAY = 'nasal_spray',

  // Rectal / vaginal
  SUPPOSITORY = 'suppository',
  ENEMA = 'enema',
  VAGINAL_TABLET = 'vaginal_tablet',
  VAGINAL_CREAM = 'vaginal_cream',
  VAGINAL_RING = 'vaginal_ring',
  PESSARY = 'pessary',

  // Dental / oral cavity
  DENTAL_GEL = 'dental_gel',
  MOUTHWASH = 'mouthwash',
  ORAL_SPRAY = 'oral_spray',

  OTHER = 'other',
}

// ---------------------------------------------------------------------------
// Route of administration
// ---------------------------------------------------------------------------
export enum RouteOfAdministration {
  ORAL = 'oral',
  SUBLINGUAL = 'sublingual',
  BUCCAL = 'buccal',
  INTRAVENOUS = 'intravenous',
  INTRAMUSCULAR = 'intramuscular',
  SUBCUTANEOUS = 'subcutaneous',
  INTRADERMAL = 'intradermal',
  INTRATHECAL = 'intrathecal',
  INTRAPERITONEAL = 'intraperitoneal',
  INTRA_ARTICULAR = 'intra_articular',
  TOPICAL = 'topical',
  TRANSDERMAL = 'transdermal',
  INHALATION = 'inhalation',
  INTRANASAL = 'intranasal',
  OPHTHALMIC = 'ophthalmic',
  OTIC = 'otic',
  RECTAL = 'rectal',
  VAGINAL = 'vaginal',
  URETHRAL = 'urethral',
  INTRAVESICAL = 'intravesical',
  EPIDURAL = 'epidural',
  OTHER = 'other',
}

// ---------------------------------------------------------------------------
// Therapeutic class — broad clinical indication group
// ---------------------------------------------------------------------------
export enum TherapeuticClass {
  ANALGESIC = 'analgesic',
  ANESTHETIC = 'anesthetic',
  ANTIBIOTIC = 'antibiotic',
  ANTIFUNGAL = 'antifungal',
  ANTIVIRAL = 'antiviral',
  ANTIPARASITIC = 'antiparasitic',
  ANTI_INFLAMMATORY = 'anti_inflammatory',
  ANTIHISTAMINE = 'antihistamine',
  ANTIHYPERTENSIVE = 'antihypertensive',
  ANTIDIABETIC = 'antidiabetic',
  ANTIDEPRESSANT = 'antidepressant',
  ANTIPSYCHOTIC = 'antipsychotic',
  ANXIOLYTIC = 'anxiolytic',
  ANTICONVULSANT = 'anticonvulsant',
  ANTICOAGULANT = 'anticoagulant',
  ANTITHROMBOTIC = 'antithrombotic',
  ANTIPLATELET = 'antiplatelet',
  ANTINEOPLASTIC = 'antineoplastic',
  IMMUNOSUPPRESSANT = 'immunosuppressant',
  IMMUNOMODULATOR = 'immunomodulator',
  VACCINE = 'vaccine',
  CARDIAC = 'cardiac',
  DIURETIC = 'diuretic',
  BRONCHODILATOR = 'bronchodilator',
  CORTICOSTEROID = 'corticosteroid',
  HORMONE = 'hormone',
  CONTRACEPTIVE = 'contraceptive',
  GASTROINTESTINAL = 'gastrointestinal',
  LAXATIVE = 'laxative',
  ANTACID = 'antacid',
  ANTIEMETIC = 'antiemetic',
  ANTIDIARRHEAL = 'antidiarrheal',
  HEMATOLOGICAL = 'hematological',
  LIPID_LOWERING = 'lipid_lowering',
  MUSCULOSKELETAL = 'musculoskeletal',
  DERMATOLOGICAL = 'dermatological',
  OPHTHALMIC = 'ophthalmic',
  OTIC = 'otic',
  NASAL = 'nasal',
  UROLOGICAL = 'urological',
  RESPIRATORY = 'respiratory',
  NEUROLOGICAL = 'neurological',
  VITAMIN_MINERAL = 'vitamin_mineral',
  HERBAL = 'herbal',
  DIAGNOSTIC = 'diagnostic',
  OTHER = 'other',
}

// ---------------------------------------------------------------------------
// Pharmacological class — mechanism-of-action grouping
// ---------------------------------------------------------------------------
export enum PharmacologicalClass {
  // Analgesics
  OPIOID = 'opioid',
  NSAID = 'nsaid',
  PARACETAMOL = 'paracetamol',
  COX2_INHIBITOR = 'cox2_inhibitor',

  // Antibiotics
  PENICILLIN = 'penicillin',
  CEPHALOSPORIN = 'cephalosporin',
  AMINOGLYCOSIDE = 'aminoglycoside',
  MACROLIDE = 'macrolide',
  FLUOROQUINOLONE = 'fluoroquinolone',
  TETRACYCLINE = 'tetracycline',
  SULFONAMIDE = 'sulfonamide',
  CARBAPENEM = 'carbapenem',
  GLYCOPEPTIDE = 'glycopeptide',
  OXAZOLIDINONE = 'oxazolidinone',
  NITROIMIDAZOLE = 'nitroimidazole',
  LINCOSAMIDE = 'lincosamide',

  // Antivirals
  NUCLEOSIDE_ANALOGUE = 'nucleoside_analogue',
  PROTEASE_INHIBITOR = 'protease_inhibitor',
  INTEGRASE_INHIBITOR = 'integrase_inhibitor',
  NEURAMINIDASE_INHIBITOR = 'neuraminidase_inhibitor',

  // Cardiovascular
  BETA_BLOCKER = 'beta_blocker',
  CALCIUM_CHANNEL_BLOCKER = 'calcium_channel_blocker',
  ACE_INHIBITOR = 'ace_inhibitor',
  ARB = 'arb',
  STATIN = 'statin',
  FIBRATE = 'fibrate',
  NITRATE = 'nitrate',
  CARDIAC_GLYCOSIDE = 'cardiac_glycoside',
  ANTIARRHYTHMIC = 'antiarrhythmic',

  // Diuretics
  LOOP_DIURETIC = 'loop_diuretic',
  THIAZIDE_DIURETIC = 'thiazide_diuretic',
  POTASSIUM_SPARING_DIURETIC = 'potassium_sparing_diuretic',

  // Antidiabetics
  BIGUANIDE = 'biguanide',
  SULFONYLUREA = 'sulfonylurea',
  DPP4_INHIBITOR = 'dpp4_inhibitor',
  GLP1_AGONIST = 'glp1_agonist',
  SGLT2_INHIBITOR = 'sglt2_inhibitor',
  INSULIN = 'insulin',

  // CNS
  SSRI = 'ssri',
  SNRI = 'snri',
  TCA = 'tca',
  MAOI = 'maoi',
  BENZODIAZEPINE = 'benzodiazepine',
  BARBITURATE = 'barbiturate',
  ATYPICAL_ANTIPSYCHOTIC = 'atypical_antipsychotic',
  TYPICAL_ANTIPSYCHOTIC = 'typical_antipsychotic',
  ANTICONVULSANT_SODIUM_CHANNEL = 'anticonvulsant_sodium_channel',
  ANTICONVULSANT_GABA = 'anticonvulsant_gaba',

  // Antifungals
  AZOLE = 'azole',
  POLYENE = 'polyene',
  ECHINOCANDIN = 'echinocandin',
  ALLYLAMINE = 'allylamine',

  // Antiparasitics
  AMINOQUINOLINE = 'aminoquinoline',
  ANTIHELMINTIC = 'antihelmintic',
  ANTIPROTOZOAL = 'antiprotozoal',

  // Respiratory
  BETA2_AGONIST_SHORT = 'beta2_agonist_short',
  BETA2_AGONIST_LONG = 'beta2_agonist_long',
  LEUKOTRIENE_MODIFIER = 'leukotriene_modifier',
  ANTICHOLINERGIC = 'anticholinergic',
  MAST_CELL_STABILIZER = 'mast_cell_stabilizer',

  // Corticosteroids
  GLUCOCORTICOID = 'glucocorticoid',
  MINERALOCORTICOID = 'mineralocorticoid',

  // Hormones
  ESTROGEN = 'estrogen',
  PROGESTIN = 'progestin',
  ANDROGEN = 'androgen',
  THYROID_HORMONE = 'thyroid_hormone',
  ANTI_THYROID = 'anti_thyroid',

  // Anticoagulants / antithrombotics
  HEPARIN = 'heparin',
  VITAMIN_K_ANTAGONIST = 'vitamin_k_antagonist',
  DOAC = 'doac',
  THROMBOLYTIC = 'thrombolytic',

  // GI
  PROTON_PUMP_INHIBITOR = 'proton_pump_inhibitor',
  H2_ANTAGONIST = 'h2_antagonist',
  ANTISPASMODIC = 'antispasmodic',
  LAXATIVE_OSMOTIC = 'laxative_osmotic',
  LAXATIVE_STIMULANT = 'laxative_stimulant',

  // Antineoplastics
  ALKYLATING_AGENT = 'alkylating_agent',
  ANTIMETABOLITE = 'antimetabolite',
  TOPOISOMERASE_INHIBITOR = 'topoisomerase_inhibitor',
  MONOCLONAL_ANTIBODY = 'monoclonal_antibody',
  TYROSINE_KINASE_INHIBITOR = 'tyrosine_kinase_inhibitor',
  IMMUNOTHERAPY = 'immunotherapy',

  // Biologics & immunology
  TNF_INHIBITOR = 'tnf_inhibitor',
  IL_INHIBITOR = 'il_inhibitor',
  CALCINEURIN_INHIBITOR = 'calcineurin_inhibitor',

  OTHER = 'other',
}

// ---------------------------------------------------------------------------
// Pregnancy safety category (FDA classification + N/A)
// ---------------------------------------------------------------------------
export enum PregnancyCategory {
  A = 'A', // No risk in controlled human studies
  B = 'B', // No risk in animal studies; no adequate human studies
  C = 'C', // Risk cannot be ruled out
  D = 'D', // Positive evidence of human risk; benefit may outweigh risk
  X = 'X', // Contraindicated in pregnancy
  NA = 'NA', // Not applicable / not classified
}

// ---------------------------------------------------------------------------
// Controlled substance schedule (based on DEA / international)
// ---------------------------------------------------------------------------
export enum ControlledSubstanceSchedule {
  SCHEDULE_I = 'schedule_I', // High abuse potential, no accepted medical use
  SCHEDULE_II = 'schedule_II', // High abuse potential, severe dependence risk
  SCHEDULE_III = 'schedule_III', // Moderate-to-low physical dependence potential
  SCHEDULE_IV = 'schedule_IV', // Low abuse potential relative to Schedule III
  SCHEDULE_V = 'schedule_V', // Low abuse potential relative to Schedule IV
  NOT_SCHEDULED = 'not_scheduled',
}

// ---------------------------------------------------------------------------
// Packaging type
// ---------------------------------------------------------------------------
export enum PackagingType {
  BLISTER = 'blister',
  BOTTLE = 'bottle',
  VIAL = 'vial',
  AMPOULE = 'ampoule',
  TUBE = 'tube',
  SACHET = 'sachet',
  STRIP = 'strip',
  BOX = 'box',
  CANISTER = 'canister',
  SYRINGE = 'syringe',
  DROPPER_BOTTLE = 'dropper_bottle',
  INHALER_DEVICE = 'inhaler_device',
  PATCH_PACK = 'patch_pack',
  PREFILLED_SYRINGE = 'prefilled_syringe',
  BAG = 'bag',
  OTHER = 'other',
}

// ---------------------------------------------------------------------------
// Storage condition — light sensitivity
// ---------------------------------------------------------------------------
export enum StorageConditionLight {
  NO_RESTRICTION = 'no_restriction',
  PROTECT_FROM_LIGHT = 'protect_from_light',
  STORE_IN_DARK = 'store_in_dark',
}

// ---------------------------------------------------------------------------
// Storage condition — moisture sensitivity
// ---------------------------------------------------------------------------
export enum StorageConditionMoisture {
  NO_RESTRICTION = 'no_restriction',
  PROTECT_FROM_MOISTURE = 'protect_from_moisture',
  STORE_IN_DRY_PLACE = 'store_in_dry_place',
}
