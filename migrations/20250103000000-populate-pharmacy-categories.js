/**
 * Migration to populate pharmacy categories and subcategories with translations
 * Date: 2025-11-03
 */

module.exports = {
  async up(db) {
    const categoriesCollection = db.collection('categories');
    const subCategoriesCollection = db.collection('subcategories');

    // Helper function to create translations
    const createTranslations = (translations) => ({
      name: translations.name || {},
      description: translations.description || {}
    });

    // Define all categories with translations
    const categories = [
      {
        name: 'Santé au Quotidien',
        translations: createTranslations({
          name: {
            en: 'Daily Health',
            fr: 'Santé au Quotidien',
            ar: 'الصحة اليومية',
            zh: '日常健康'
          }
        })
      },
      {
        name: 'Santé Chronique',
        translations: createTranslations({
          name: {
            en: 'Chronic Health',
            fr: 'Santé Chronique',
            ar: 'الصحة المزمنة',
            zh: '慢性健康'
          }
        })
      },
      {
        name: 'Soins du Corp',
        translations: createTranslations({
          name: {
            en: 'Body Care',
            fr: 'Soins du Corp',
            ar: 'العناية بالجسم',
            zh: '身体护理'
          }
        })
      },
      {
        name: 'Santé Digestive',
        translations: createTranslations({
          name: {
            en: 'Digestive Health',
            fr: 'Santé Digestive',
            ar: 'الصحة الهضمية',
            zh: '消化健康'
          }
        })
      },
      {
        name: 'Santé des Enfants',
        translations: createTranslations({
          name: {
            en: 'Children\'s Health',
            fr: 'Santé des Enfants',
            ar: 'صحة الأطفال',
            zh: '儿童健康'
          }
        })
      },
      {
        name: 'Bien-être et Prévention',
        translations: createTranslations({
          name: {
            en: 'Wellness and Prevention',
            fr: 'Bien-être et Prévention',
            ar: 'العافية والوقاية',
            zh: '健康与预防'
          }
        })
      },
      {
        name: 'Santé Intime',
        translations: createTranslations({
          name: {
            en: 'Intimate Health',
            fr: 'Santé Intime',
            ar: 'الصحة الحميمة',
            zh: '私密健康'
          }
        })
      },
      {
        name: 'Premiers Secours',
        translations: createTranslations({
          name: {
            en: 'First Aid',
            fr: 'Premiers Secours',
            ar: 'الإسعافات الأولية',
            zh: '急救'
          }
        })
      }
    ];

    // Insert categories and get their IDs
    const categoryMap = {};
    for (const category of categories) {
      const result = await categoriesCollection.insertOne({
        ...category,
        created_at: new Date(),
        updated_at: new Date()
      });
      categoryMap[category.name] = result.insertedId;
    }

    // Define all subcategories with their nested structure
    const subcategoriesData = [
      // Santé au Quotidien
      {
        categoryName: 'Santé au Quotidien',
        name: 'Maux du quotidien',
        translations: createTranslations({
          name: {
            en: 'Daily Ailments',
            fr: 'Maux du quotidien',
            ar: 'الآلام اليومية',
            zh: '日常病痛'
          }
        }),
        children: [
          {
            name: 'Douleurs',
            translations: createTranslations({
              name: { en: 'Pain', fr: 'Douleurs', ar: 'آلام', zh: '疼痛' }
            })
          },
          {
            name: 'Fièvre',
            translations: createTranslations({
              name: { en: 'Fever', fr: 'Fièvre', ar: 'حمى', zh: '发烧' }
            })
          },
          {
            name: 'Allergies',
            translations: createTranslations({
              name: { en: 'Allergies', fr: 'Allergies', ar: 'الحساسية', zh: '过敏' }
            })
          },
          {
            name: 'Rhume',
            translations: createTranslations({
              name: { en: 'Cold', fr: 'Rhume', ar: 'نزلة برد', zh: '感冒' }
            })
          },
          {
            name: 'Toux',
            translations: createTranslations({
              name: { en: 'Cough', fr: 'Toux', ar: 'سعال', zh: '咳嗽' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé au Quotidien',
        name: 'Vitamines et compléments alimentaires',
        translations: createTranslations({
          name: {
            en: 'Vitamins and Dietary Supplements',
            fr: 'Vitamines et compléments alimentaires',
            ar: 'الفيتامينات والمكملات الغذائية',
            zh: '维生素和膳食补充剂'
          }
        })
      },
      {
        categoryName: 'Santé au Quotidien',
        name: 'Antibiotiques (généraux et oraux)',
        translations: createTranslations({
          name: {
            en: 'Antibiotics (General and Oral)',
            fr: 'Antibiotiques (généraux et oraux)',
            ar: 'المضادات الحيوية (العامة والفموية)',
            zh: '抗生素（一般和口服）'
          }
        })
      },
      {
        categoryName: 'Santé au Quotidien',
        name: 'Antiviraux',
        translations: createTranslations({
          name: {
            en: 'Antivirals',
            fr: 'Antiviraux',
            ar: 'مضادات الفيروسات',
            zh: '抗病毒药物'
          }
        })
      },

      // Santé Chronique
      {
        categoryName: 'Santé Chronique',
        name: 'Diabète',
        translations: createTranslations({
          name: {
            en: 'Diabetes',
            fr: 'Diabète',
            ar: 'السكري',
            zh: '糖尿病'
          }
        }),
        children: [
          {
            name: 'Bandelettes glycémie',
            translations: createTranslations({
              name: { en: 'Blood Glucose Test Strips', fr: 'Bandelettes glycémie', ar: 'شرائط اختبار الجلوكوز', zh: '血糖试纸' }
            })
          },
          {
            name: 'Stylos à insuline',
            translations: createTranslations({
              name: { en: 'Insulin Pens', fr: 'Stylos à insuline', ar: 'أقلام الأنسولين', zh: '胰岛素笔' }
            })
          },
          {
            name: 'Antidiabétiques oraux',
            translations: createTranslations({
              name: { en: 'Oral Antidiabetics', fr: 'Antidiabétiques oraux', ar: 'أدوية السكري الفموية', zh: '口服降糖药' }
            })
          },
          {
            name: 'Lecteurs de glycémie',
            translations: createTranslations({
              name: { en: 'Blood Glucose Meters', fr: 'Lecteurs de glycémie', ar: 'أجهزة قياس السكر', zh: '血糖仪' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Tension artérielle',
        translations: createTranslations({
          name: {
            en: 'Blood Pressure',
            fr: 'Tension artérielle',
            ar: 'ضغط الدم',
            zh: '血压'
          }
        }),
        children: [
          {
            name: 'Tensiomètres',
            translations: createTranslations({
              name: { en: 'Blood Pressure Monitors', fr: 'Tensiomètres', ar: 'أجهزة قياس ضغط الدم', zh: '血压计' }
            })
          },
          {
            name: 'Bêta-bloquants',
            translations: createTranslations({
              name: { en: 'Beta-Blockers', fr: 'Bêta-bloquants', ar: 'حاصرات بيتا', zh: 'β受体阻滞剂' }
            })
          },
          {
            name: 'ARA2/ Sartans',
            translations: createTranslations({
              name: { en: 'ARBs / Sartans', fr: 'ARA2/ Sartans', ar: 'حاصرات مستقبلات الأنجيوتنسين', zh: '血管紧张素受体拮抗剂' }
            })
          },
          {
            name: 'Diurétiques',
            translations: createTranslations({
              name: { en: 'Diuretics', fr: 'Diurétiques', ar: 'مدرات البول', zh: '利尿剂' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Cholestérol',
        translations: createTranslations({
          name: {
            en: 'Cholesterol',
            fr: 'Cholestérol',
            ar: 'الكوليسترول',
            zh: '胆固醇'
          }
        })
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Troubles neurologiques',
        translations: createTranslations({
          name: {
            en: 'Neurological Disorders',
            fr: 'Troubles neurologiques',
            ar: 'الاضطرابات العصبية',
            zh: '神经系统疾病'
          }
        })
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Médicaments cardiovasculaires',
        translations: createTranslations({
          name: {
            en: 'Cardiovascular Medications',
            fr: 'Médicaments cardiovasculaires',
            ar: 'أدوية القلب والأوعية الدموية',
            zh: '心血管药物'
          }
        })
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Anticoagulants',
        translations: createTranslations({
          name: {
            en: 'Anticoagulants',
            fr: 'Anticoagulants',
            ar: 'مضادات التخثر',
            zh: '抗凝血剂'
          }
        })
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Traitements hormonaux',
        translations: createTranslations({
          name: {
            en: 'Hormone Treatments',
            fr: 'Traitements hormonaux',
            ar: 'العلاجات الهرمونية',
            zh: '激素治疗'
          }
        })
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Médicaments respiratoires',
        translations: createTranslations({
          name: {
            en: 'Respiratory Medications',
            fr: 'Médicaments respiratoires',
            ar: 'أدوية الجهاز التنفسي',
            zh: '呼吸系统药物'
          }
        }),
        children: [
          {
            name: 'Asthme/BPCO',
            translations: createTranslations({
              name: { en: 'Asthma/COPD', fr: 'Asthme/BPCO', ar: 'الربو/انسداد الرئة المزمن', zh: '哮喘/慢阻肺' }
            })
          },
          {
            name: 'Inhalateurs',
            translations: createTranslations({
              name: { en: 'Inhalers', fr: 'Inhalateurs', ar: 'أجهزة الاستنشاق', zh: '吸入器' }
            })
          },
          {
            name: 'Nébuliseurs',
            translations: createTranslations({
              name: { en: 'Nebulizers', fr: 'Nébuliseurs', ar: 'أجهزة الرذاذ', zh: '雾化器' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Antidépresseurs / Anxiolytiques',
        translations: createTranslations({
          name: {
            en: 'Antidepressants / Anxiolytics',
            fr: 'Antidépresseurs / Anxiolytiques',
            ar: 'مضادات الاكتئاب / مضادات القلق',
            zh: '抗抑郁药/抗焦虑药'
          }
        })
      },
      {
        categoryName: 'Santé Chronique',
        name: 'Cancer / Oncologie',
        translations: createTranslations({
          name: {
            en: 'Cancer / Oncology',
            fr: 'Cancer / Oncologie',
            ar: 'السرطان / علم الأورام',
            zh: '癌症/肿瘤学'
          }
        })
      },

      // Soins du Corp
      {
        categoryName: 'Soins du Corp',
        name: 'Soins de la peau',
        translations: createTranslations({
          name: {
            en: 'Skin Care',
            fr: 'Soins de la peau',
            ar: 'العناية بالبشرة',
            zh: '皮肤护理'
          }
        }),
        children: [
          {
            name: 'Crèmes hydratantes',
            translations: createTranslations({
              name: { en: 'Moisturizing Creams', fr: 'Crèmes hydratantes', ar: 'كريمات مرطبة', zh: '保湿霜' }
            })
          },
          {
            name: 'Traitement de l\'acné',
            translations: createTranslations({
              name: { en: 'Acne Treatment', fr: 'Traitement de l\'acné', ar: 'علاج حب الشباب', zh: '痤疮治疗' }
            })
          },
          {
            name: 'Cicatrisation',
            translations: createTranslations({
              name: { en: 'Wound Healing', fr: 'Cicatrisation', ar: 'التئام الجروح', zh: '伤口愈合' }
            })
          }
        ]
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Douleurs musculaires et articulaires',
        translations: createTranslations({
          name: {
            en: 'Muscle and Joint Pain',
            fr: 'Douleurs musculaires et articulaires',
            ar: 'آلام العضلات والمفاصل',
            zh: '肌肉和关节疼痛'
          }
        }),
        children: [
          {
            name: 'Gel chauffant',
            translations: createTranslations({
              name: { en: 'Heating Gel', fr: 'Gel chauffant', ar: 'جل تدفئة', zh: '加热凝胶' }
            })
          },
          {
            name: 'Bandages',
            translations: createTranslations({
              name: { en: 'Bandages', fr: 'Bandages', ar: 'ضمادات', zh: '绷带' }
            })
          },
          {
            name: 'AINS',
            translations: createTranslations({
              name: { en: 'NSAIDs', fr: 'AINS', ar: 'مضادات الالتهاب غير الستيرويدية', zh: '非甾体抗炎药' }
            })
          },
          {
            name: 'Myorelaxants',
            translations: createTranslations({
              name: { en: 'Muscle Relaxants', fr: 'Myorelaxants', ar: 'مرخيات العضلات', zh: '肌肉松弛剂' }
            })
          }
        ]
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Produits pour les pieds',
        translations: createTranslations({
          name: {
            en: 'Foot Care Products',
            fr: 'Produits pour les pieds',
            ar: 'منتجات العناية بالقدمين',
            zh: '足部护理产品'
          }
        }),
        children: [
          {
            name: 'Crèmes anti-transpiration',
            translations: createTranslations({
              name: { en: 'Anti-Perspirant Creams', fr: 'Crèmes anti-transpiration', ar: 'كريمات مضادة للتعرق', zh: '止汗霜' }
            })
          },
          {
            name: 'Soins des cors / durillons',
            translations: createTranslations({
              name: { en: 'Corn / Callus Care', fr: 'Soins des cors / durillons', ar: 'علاج الدُشْبُذات', zh: '鸡眼/老茧护理' }
            })
          }
        ]
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Soins des yeux et des lentilles',
        translations: createTranslations({
          name: {
            en: 'Eye and Contact Lens Care',
            fr: 'Soins des yeux et des lentilles',
            ar: 'العناية بالعيون والعدسات',
            zh: '眼部和隐形眼镜护理'
          }
        }),
        children: [
          {
            name: 'Gouttes hydratantes',
            translations: createTranslations({
              name: { en: 'Moisturizing Drops', fr: 'Gouttes hydratantes', ar: 'قطرات مرطبة', zh: '保湿滴眼液' }
            })
          },
          {
            name: 'Produits d\'entretien',
            translations: createTranslations({
              name: { en: 'Maintenance Products', fr: 'Produits d\'entretien', ar: 'منتجات الصيانة', zh: '保养产品' }
            })
          },
          {
            name: 'Anti-infectieux ophtalmiques',
            translations: createTranslations({
              name: { en: 'Ophthalmic Anti-Infectives', fr: 'Anti-infectieux ophtalmiques', ar: 'مضادات العدوى العينية', zh: '眼科抗感染药' }
            })
          }
        ]
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Soins capillaires',
        translations: createTranslations({
          name: {
            en: 'Hair Care',
            fr: 'Soins capillaires',
            ar: 'العناية بالشعر',
            zh: '头发护理'
          }
        }),
        children: [
          {
            name: 'Shampooings',
            translations: createTranslations({
              name: { en: 'Shampoos', fr: 'Shampooings', ar: 'شامبو', zh: '洗发水' }
            })
          },
          {
            name: 'Anti-chute',
            translations: createTranslations({
              name: { en: 'Anti-Hair Loss', fr: 'Anti-chute', ar: 'مضاد لتساقط الشعر', zh: '防脱发' }
            })
          },
          {
            name: 'Anti-poux',
            translations: createTranslations({
              name: { en: 'Anti-Lice', fr: 'Anti-poux', ar: 'مضاد للقمل', zh: '除虱' }
            })
          },
          {
            name: 'Masques',
            translations: createTranslations({
              name: { en: 'Hair Masks', fr: 'Masques', ar: 'أقنعة', zh: '发膜' }
            })
          }
        ]
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Colorations',
        translations: createTranslations({
          name: {
            en: 'Hair Coloring',
            fr: 'Colorations',
            ar: 'صبغات الشعر',
            zh: '染发'
          }
        })
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Cosmétiques & maquillage',
        translations: createTranslations({
          name: {
            en: 'Cosmetics & Makeup',
            fr: 'Cosmétiques & maquillage',
            ar: 'مستحضرات التجميل والمكياج',
            zh: '化妆品和彩妆'
          }
        })
      },
      {
        categoryName: 'Soins du Corp',
        name: 'Accessoires de soins personnels',
        translations: createTranslations({
          name: {
            en: 'Personal Care Accessories',
            fr: 'Accessoires de soins personnels',
            ar: 'إكسسوارات العناية الشخصية',
            zh: '个人护理配件'
          }
        })
      },

      // Santé Digestive
      {
        categoryName: 'Santé Digestive',
        name: 'Brûlures d\'estomac, reflux',
        translations: createTranslations({
          name: {
            en: 'Heartburn, Reflux',
            fr: 'Brûlures d\'estomac, reflux',
            ar: 'حرقة المعدة والارتجاع',
            zh: '胃灼热、反流'
          }
        }),
        children: [
          {
            name: 'Antiacides',
            translations: createTranslations({
              name: { en: 'Antacids', fr: 'Antiacides', ar: 'مضادات الحموضة', zh: '抗酸剂' }
            })
          },
          {
            name: 'Inhibiteurs de la pompe à protons',
            translations: createTranslations({
              name: { en: 'Proton Pump Inhibitors', fr: 'Inhibiteurs de la pompe à protons', ar: 'مثبطات مضخة البروتون', zh: '质子泵抑制剂' }
            })
          },
          {
            name: 'Protecteurs Gastriques',
            translations: createTranslations({
              name: { en: 'Gastric Protectors', fr: 'Protecteurs Gastriques', ar: 'واقيات المعدة', zh: '胃保护剂' }
            })
          },
          {
            name: 'Tisanes Digestives',
            translations: createTranslations({
              name: { en: 'Digestive Teas', fr: 'Tisanes Digestives', ar: 'شاي هضمي', zh: '消化茶' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Digestive',
        name: 'Constipation, diarrhée',
        translations: createTranslations({
          name: {
            en: 'Constipation, Diarrhea',
            fr: 'Constipation, diarrhée',
            ar: 'الإمساك والإسهال',
            zh: '便秘、腹泻'
          }
        }),
        children: [
          {
            name: 'Laxatifs doux',
            translations: createTranslations({
              name: { en: 'Mild Laxatives', fr: 'Laxatifs doux', ar: 'ملينات خفيفة', zh: '温和泻药' }
            })
          },
          {
            name: 'Antidiarrhéiques',
            translations: createTranslations({
              name: { en: 'Antidiarrheals', fr: 'Antidiarrhéiques', ar: 'مضادات الإسهال', zh: '止泻药' }
            })
          },
          {
            name: 'SRO',
            translations: createTranslations({
              name: { en: 'ORS (Oral Rehydration Salts)', fr: 'SRO', ar: 'أملاح الإماهة الفموية', zh: '口服补液盐' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Digestive',
        name: 'Nausées, vomissements',
        translations: createTranslations({
          name: {
            en: 'Nausea, Vomiting',
            fr: 'Nausées, vomissements',
            ar: 'الغثيان والقيء',
            zh: '恶心、呕吐'
          }
        })
      },
      {
        categoryName: 'Santé Digestive',
        name: 'Antiparasitaires / vermifuges',
        translations: createTranslations({
          name: {
            en: 'Antiparasitics / Dewormers',
            fr: 'Antiparasitaires / vermifuges',
            ar: 'مضادات الطفيليات / طاردات الديدان',
            zh: '驱虫药'
          }
        })
      },
      {
        categoryName: 'Santé Digestive',
        name: 'Solutions de réhydratation et perfusion',
        translations: createTranslations({
          name: {
            en: 'Rehydration and IV Solutions',
            fr: 'Solutions de réhydratation et perfusion',
            ar: 'محاليل الإماهة والحقن الوريدي',
            zh: '补液和输液溶液'
          }
        })
      },

      // Santé des Enfants
      {
        categoryName: 'Santé des Enfants',
        name: 'Douleurs et fièvre pédiatrique',
        translations: createTranslations({
          name: {
            en: 'Pediatric Pain and Fever',
            fr: 'Douleurs et fièvre pédiatrique',
            ar: 'آلام وحمى الأطفال',
            zh: '儿童疼痛和发热'
          }
        }),
        children: [
          {
            name: 'Sirops',
            translations: createTranslations({
              name: { en: 'Syrups', fr: 'Sirops', ar: 'شراب', zh: '糖浆' }
            })
          },
          {
            name: 'Sprays nasaux',
            translations: createTranslations({
              name: { en: 'Nasal Sprays', fr: 'Sprays nasaux', ar: 'بخاخات الأنف', zh: '鼻腔喷雾' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé des Enfants',
        name: 'Soins pour les petits bobos',
        translations: createTranslations({
          name: {
            en: 'Care for Minor Injuries',
            fr: 'Soins pour les petits bobos',
            ar: 'العناية بالإصابات الطفيفة',
            zh: '小伤口护理'
          }
        })
      },
      {
        categoryName: 'Santé des Enfants',
        name: 'Vitamines pour enfants',
        translations: createTranslations({
          name: {
            en: 'Children\'s Vitamins',
            fr: 'Vitamines pour enfants',
            ar: 'فيتامينات الأطفال',
            zh: '儿童维生素'
          }
        })
      },
      {
        categoryName: 'Santé des Enfants',
        name: 'Alimentation bébé',
        translations: createTranslations({
          name: {
            en: 'Baby Food',
            fr: 'Alimentation bébé',
            ar: 'طعام الأطفال',
            zh: '婴儿食品'
          }
        }),
        children: [
          {
            name: 'Lait infantile',
            translations: createTranslations({
              name: { en: 'Infant Formula', fr: 'Lait infantile', ar: 'حليب الأطفال', zh: '婴儿配方奶' }
            })
          },
          {
            name: 'Petits pots',
            translations: createTranslations({
              name: { en: 'Baby Food Jars', fr: 'Petits pots', ar: 'أطعمة الأطفال الجاهزة', zh: '婴儿辅食罐头' }
            })
          },
          {
            name: 'Céréales',
            translations: createTranslations({
              name: { en: 'Cereals', fr: 'Céréales', ar: 'حبوب', zh: '谷物' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé des Enfants',
        name: 'Traitements pédiatriques divers',
        translations: createTranslations({
          name: {
            en: 'Various Pediatric Treatments',
            fr: 'Traitements pédiatriques divers',
            ar: 'علاجات الأطفال المتنوعة',
            zh: '各种儿科治疗'
          }
        })
      },
      {
        categoryName: 'Santé des Enfants',
        name: 'Puériculture & accessoires',
        translations: createTranslations({
          name: {
            en: 'Childcare & Accessories',
            fr: 'Puériculture & accessoires',
            ar: 'رعاية الطفل والإكسسوارات',
            zh: '育儿用品及配件'
          }
        })
      },

      // Bien-être et Prévention
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Arrêt du tabac',
        translations: createTranslations({
          name: {
            en: 'Smoking Cessation',
            fr: 'Arrêt du tabac',
            ar: 'الإقلاع عن التدخين',
            zh: '戒烟'
          }
        })
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Hydratation et soins buccaux',
        translations: createTranslations({
          name: {
            en: 'Hydration and Oral Care',
            fr: 'Hydratation et soins buccaux',
            ar: 'الترطيب والعناية بالفم',
            zh: '补水和口腔护理'
          }
        }),
        children: [
          {
            name: 'Bains de bouche',
            translations: createTranslations({
              name: { en: 'Mouthwash', fr: 'Bains de bouche', ar: 'غسول الفم', zh: '漱口水' }
            })
          },
          {
            name: 'Dentifrices',
            translations: createTranslations({
              name: { en: 'Toothpaste', fr: 'Dentifrices', ar: 'معجون أسنان', zh: '牙膏' }
            })
          },
          {
            name: 'Brosses à dents',
            translations: createTranslations({
              name: { en: 'Toothbrushes', fr: 'Brosses à dents', ar: 'فرش الأسنان', zh: '牙刷' }
            })
          }
        ]
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Protection solaire',
        translations: createTranslations({
          name: {
            en: 'Sun Protection',
            fr: 'Protection solaire',
            ar: 'الحماية من الشمس',
            zh: '防晒'
          }
        })
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Produits d\'hygiène personnelle',
        translations: createTranslations({
          name: {
            en: 'Personal Hygiene Products',
            fr: 'Produits d\'hygiène personnelle',
            ar: 'منتجات النظافة الشخصية',
            zh: '个人卫生产品'
          }
        })
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Tests de diagnostic',
        translations: createTranslations({
          name: {
            en: 'Diagnostic Tests',
            fr: 'Tests de diagnostic',
            ar: 'اختبارات التشخيص',
            zh: '诊断测试'
          }
        })
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Hygiène nasale',
        translations: createTranslations({
          name: {
            en: 'Nasal Hygiene',
            fr: 'Hygiène nasale',
            ar: 'نظافة الأنف',
            zh: '鼻腔卫生'
          }
        })
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Compléments capillaires',
        translations: createTranslations({
          name: {
            en: 'Hair Supplements',
            fr: 'Compléments capillaires',
            ar: 'مكملات الشعر',
            zh: '头发补充剂'
          }
        })
      },
      {
        categoryName: 'Bien-être et Prévention',
        name: 'Vaccins',
        translations: createTranslations({
          name: {
            en: 'Vaccines',
            fr: 'Vaccins',
            ar: 'لقاحات',
            zh: '疫苗'
          }
        })
      },

      // Santé Intime
      {
        categoryName: 'Santé Intime',
        name: 'Hygiène féminine',
        translations: createTranslations({
          name: {
            en: 'Feminine Hygiene',
            fr: 'Hygiène féminine',
            ar: 'النظافة النسائية',
            zh: '女性卫生'
          }
        }),
        children: [
          {
            name: 'Protections hygiéniques',
            translations: createTranslations({
              name: { en: 'Sanitary Protection', fr: 'Protections hygiéniques', ar: 'الفوط الصحية', zh: '卫生巾' }
            })
          },
          {
            name: 'Soins lavants intimes',
            translations: createTranslations({
              name: { en: 'Intimate Wash', fr: 'Soins lavants intimes', ar: 'غسول المنطقة الحميمة', zh: '私处清洁' }
            })
          },
          {
            name: 'Lubrifiants',
            translations: createTranslations({
              name: { en: 'Lubricants', fr: 'Lubrifiants', ar: 'مواد التشحيم', zh: '润滑剂' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Intime',
        name: 'Soins urinaires',
        translations: createTranslations({
          name: {
            en: 'Urinary Care',
            fr: 'Soins urinaires',
            ar: 'العناية بالمسالك البولية',
            zh: '泌尿护理'
          }
        })
      },
      {
        categoryName: 'Santé Intime',
        name: 'Contraception',
        translations: createTranslations({
          name: {
            en: 'Contraception',
            fr: 'Contraception',
            ar: 'منع الحمل',
            zh: '避孕'
          }
        }),
        children: [
          {
            name: 'Préservatifs',
            translations: createTranslations({
              name: { en: 'Condoms', fr: 'Préservatifs', ar: 'الواقي الذكري', zh: '避孕套' }
            })
          },
          {
            name: 'Pilules contraceptive',
            translations: createTranslations({
              name: { en: 'Contraceptive Pills', fr: 'Pilules contraceptive', ar: 'حبوب منع الحمل', zh: '避孕药' }
            })
          },
          {
            name: 'Spermicides',
            translations: createTranslations({
              name: { en: 'Spermicides', fr: 'Spermicides', ar: 'قاتلات النطاف', zh: '杀精剂' }
            })
          }
        ]
      },
      {
        categoryName: 'Santé Intime',
        name: 'Soins intimes',
        translations: createTranslations({
          name: {
            en: 'Intimate Care',
            fr: 'Soins intimes',
            ar: 'العناية الحميمة',
            zh: '私密护理'
          }
        })
      },
      {
        categoryName: 'Santé Intime',
        name: 'Traitements gynécologiques',
        translations: createTranslations({
          name: {
            en: 'Gynecological Treatments',
            fr: 'Traitements gynécologiques',
            ar: 'العلاجات النسائية',
            zh: '妇科治疗'
          }
        })
      },
      {
        categoryName: 'Santé Intime',
        name: 'Soins généraux non spécifiques',
        translations: createTranslations({
          name: {
            en: 'General Non-Specific Care',
            fr: 'Soins généraux non spécifiques',
            ar: 'الرعاية العامة غير المحددة',
            zh: '一般非特定护理'
          }
        })
      },

      // Premiers Secours
      {
        categoryName: 'Premiers Secours',
        name: 'Pansements et désinfectants',
        translations: createTranslations({
          name: {
            en: 'Bandages and Disinfectants',
            fr: 'Pansements et désinfectants',
            ar: 'الضمادات والمطهرات',
            zh: '绷带和消毒剂'
          }
        }),
        children: [
          {
            name: 'Antiseptiques',
            translations: createTranslations({
              name: { en: 'Antiseptics', fr: 'Antiseptiques', ar: 'مطهرات', zh: '防腐剂' }
            })
          },
          {
            name: 'Hémostatiques',
            translations: createTranslations({
              name: { en: 'Hemostatics', fr: 'Hémostatiques', ar: 'مرقئات الدم', zh: '止血剂' }
            })
          }
        ]
      },
      {
        categoryName: 'Premiers Secours',
        name: 'Matériel médical',
        translations: createTranslations({
          name: {
            en: 'Medical Equipment',
            fr: 'Matériel médical',
            ar: 'المعدات الطبية',
            zh: '医疗设备'
          }
        }),
        children: [
          {
            name: 'Thermomètres',
            translations: createTranslations({
              name: { en: 'Thermometers', fr: 'Thermomètres', ar: 'موازين الحرارة', zh: '温度计' }
            })
          },
          {
            name: 'Bandages',
            translations: createTranslations({
              name: { en: 'Bandages', fr: 'Bandages', ar: 'ضمادات', zh: '绷带' }
            })
          },
          {
            name: 'Orthopédie & Contentions',
            translations: createTranslations({
              name: { en: 'Orthopedics & Restraints', fr: 'Orthopédie & Contentions', ar: 'تقويم العظام والدعامات', zh: '矫形器和约束' }
            })
          },
          {
            name: 'Incontinence',
            translations: createTranslations({
              name: { en: 'Incontinence', fr: 'Incontinence', ar: 'سلس البول', zh: '失禁' }
            })
          }
        ]
      },
      {
        categoryName: 'Premiers Secours',
        name: 'Orthèses spécialisées',
        translations: createTranslations({
          name: {
            en: 'Specialized Orthoses',
            fr: 'Orthèses spécialisées',
            ar: 'الأجهزة التقويمية المتخصصة',
            zh: '专用矫形器'
          }
        })
      },
      {
        categoryName: 'Premiers Secours',
        name: 'Matériel d\'inhalation',
        translations: createTranslations({
          name: {
            en: 'Inhalation Equipment',
            fr: 'Matériel d\'inhalation',
            ar: 'معدات الاستنشاق',
            zh: '吸入设备'
          }
        })
      }
    ];

    // Helper function to insert subcategories recursively
    async function insertSubcategory(subcategoryData, categoryId, parentId = null, level = 0) {
      const { name, translations, children, categoryName } = subcategoryData;
      
      const subcategoryDoc = {
        name,
        translations,
        categoryId,
        parentId,
        level,
        ancestors: parentId ? await getAncestors(parentId) : [],
        children: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await subCategoriesCollection.insertOne(subcategoryDoc);
      const subcategoryId = result.insertedId;

      // If there are children, insert them recursively
      if (children && children.length > 0) {
        for (const child of children) {
          await insertSubcategory(child, categoryId, subcategoryId, level + 1);
        }
      }

      return subcategoryId;
    }

    // Helper function to get ancestors array
    async function getAncestors(parentId) {
      if (!parentId) return [];
      
      const parent = await subCategoriesCollection.findOne({ _id: parentId });
      if (!parent) return [];
      
      return [...(parent.ancestors || []), parentId];
    }

    // Insert all subcategories
    for (const subcategoryData of subcategoriesData) {
      const categoryId = categoryMap[subcategoryData.categoryName];
      if (categoryId) {
        await insertSubcategory(subcategoryData, categoryId);
      }
    }

    console.log('✅ Migration completed successfully');
    console.log(`   - Created ${categories.length} categories`);
    console.log(`   - Created subcategories with translations in EN, FR, AR, ZH`);
  },

  async down(db) {
    const categoriesCollection = db.collection('categories');
    const subCategoriesCollection = db.collection('subcategories');

    // Get all category IDs from this migration
    const categories = await categoriesCollection.find({
      name: {
        $in: [
          'Santé au Quotidien',
          'Santé Chronique',
          'Soins du Corp',
          'Santé Digestive',
          'Santé des Enfants',
          'Bien-être et Prévention',
          'Santé Intime',
          'Premiers Secours'
        ]
      }
    }).toArray();

    const categoryIds = categories.map(cat => cat._id);

    // Delete all subcategories associated with these categories
    await subCategoriesCollection.deleteMany({
      categoryId: { $in: categoryIds }
    });

    // Delete the categories
    await categoriesCollection.deleteMany({
      _id: { $in: categoryIds }
    });

    console.log('✅ Migration rolled back successfully');
  }
};
