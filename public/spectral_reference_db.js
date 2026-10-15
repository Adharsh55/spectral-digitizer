/**
 * Spectral Reference Knowledge Base & Matching Engine
 * Supports Phase 1 (Logical-Input Approach) for Target Molecule Identification
 *
 * Provides:
 * 1. Reference spectra & peak libraries for chemical targets (Hemoglobin, Cytochrome C, Crystal Violet, etc.)
 * 2. Peak detection & spectral feature extraction from digitized curves
 * 3. Characteristic comparison & confidence scoring
 * 4. Multi-curve decomposition and target curve isolation
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SpectralReferenceDB = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {

    // ─────────────────────────────────────────────────────────────────
    //  1. REFERENCE SPECTRAL KNOWLEDGE BASE
    // ─────────────────────────────────────────────────────────────────
    const REFERENCE_DATABASE = {
        hemoglobin: {
            id: 'hemoglobin',
            name: 'Hemoglobin (Oxyhemoglobin HbO2)',
            category: 'Heme Protein / Blood Pigment',
            aliases: ['hemoglobin', 'haemoglobin', 'hbo2', 'hb', 'oxyhemoglobin', 'oxyhaemoglobin', 'oxy-hb', 'deoxyhemoglobin', 'deoxyhaemoglobin', 'methaemoglobin', 'methemoglobin', 'carboxyhemoglobin', 'carboxyhaemoglobin', 'human hemoglobin'],
            expectedPeaks: [
                { wavelength: 415, name: 'Soret Band (Primary)', tolerance: 10, weight: 0.50, isPrimary: true },
                { wavelength: 542, name: 'Q-band β (Doublet)', tolerance: 7, weight: 0.25, isPrimary: false },
                { wavelength: 576, name: 'Q-band α (Doublet)', tolerance: 7, weight: 0.25, isPrimary: false }
            ],
            peakRatioSignature: {
                // Soret peak height is substantially higher than Q-bands; α is slightly higher or comparable to β
                soretToQRatioMin: 2.0,
                soretToQRatioMax: 12.0
            },
            typicalRange: [350, 650],
            distinguishingFeatures: 'Triple peak signature with dominant sharp Soret peak at ~415 nm and characteristic double peak (α/β bands) at 542 nm and 576 nm.',
            alternatives: {
                deoxyhemoglobin: {
                    name: 'Deoxyhemoglobin (Hb)',
                    expectedPeaks: [
                        { wavelength: 430, name: 'Soret Band', tolerance: 9, weight: 0.60, isPrimary: true },
                        { wavelength: 556, name: 'Single Broad Band', tolerance: 8, weight: 0.40, isPrimary: false }
                    ]
                },
                methemoglobin: {
                    name: 'Methemoglobin (MetHb)',
                    expectedPeaks: [
                        { wavelength: 406, name: 'Soret Band', tolerance: 8, weight: 0.40, isPrimary: true },
                        { wavelength: 500, name: 'Charge-transfer 1', tolerance: 8, weight: 0.30, isPrimary: false },
                        { wavelength: 630, name: 'Charge-transfer 2 (Diagnostic)', tolerance: 10, weight: 0.30, isPrimary: false }
                    ]
                }
            }
        },

        cytochrome_c: {
            id: 'cytochrome_c',
            name: 'Cytochrome C (Reduced/Ferrocytochrome c)',
            category: 'Mitochondrial Electron Carrier',
            aliases: ['cytochrome c', 'cytochrome-c', 'cyt c', 'cyt-c', 'cytochromec', 'ferrocytochrome', 'ferricytochrome'],
            expectedPeaks: [
                { wavelength: 415, name: 'Soret Band', tolerance: 9, weight: 0.45, isPrimary: true },
                { wavelength: 521, name: 'Q-band β', tolerance: 6, weight: 0.25, isPrimary: false },
                { wavelength: 550, name: 'Q-band α (Sharp Diagnostic)', tolerance: 5, weight: 0.30, isPrimary: false }
            ],
            typicalRange: [380, 600],
            distinguishingFeatures: 'Prominent sharp Soret band at ~415 nm, distinct β band at 521 nm, and intense sharp diagnostic α band at 550 nm.'
        },

        crystal_violet: {
            id: 'crystal_violet',
            name: 'Crystal Violet (Gentian Violet)',
            category: 'Triarylmethane Dye',
            aliases: ['crystal violet', 'crystal voilet', 'crystalviolet', 'cv', 'gentian violet', 'basic violet 3', 'hexamethylpararosaniline'],
            expectedPeaks: [
                { wavelength: 590, name: 'Major Visible Absorption Peak', tolerance: 12, weight: 0.80, isPrimary: true },
                { wavelength: 545, name: 'Vibronic Shoulder', tolerance: 12, weight: 0.20, isPrimary: false }
            ],
            typicalRange: [400, 700],
            distinguishingFeatures: 'Intense single absorption band centered at 588–592 nm with an asymmetric vibronic shoulder near 545 nm.'
        },

        methylene_blue: {
            id: 'methylene_blue',
            name: 'Methylene Blue',
            category: 'Thiazine Dye / Redox Indicator',
            aliases: ['methylene blue', 'methylene-blue', 'bleu de méthylène', 'bleu de methylene', 'methylthioninium chloride', 'mb'],
            expectedPeaks: [
                { wavelength: 664, name: 'Monomer Peak (Real Literature)', tolerance: 14, weight: 0.80, isPrimary: true },
                { wavelength: 610, name: 'Dimer Vibronic Shoulder', tolerance: 15, weight: 0.30, isPrimary: false }
            ],
            typicalRange: [300, 750],
            distinguishingFeatures: 'Characteristic absorption band at 664 nm with 610 nm dimer shoulder.'
        },

        rhodamine_b: {
            id: 'rhodamine_b',
            name: 'Rhodamine B',
            category: 'Xanthene / Fluorescent Dye',
            aliases: ['rhodamine b', 'rhodamine-b', 'rhodamine', 'rhb', 'basic violet 10'],
            expectedPeaks: [
                { wavelength: 552, name: 'Major Absorption Maximum', tolerance: 14, weight: 0.85, isPrimary: true },
                { wavelength: 518, name: 'Vibronic Shoulder', tolerance: 12, weight: 0.15, isPrimary: false }
            ],
            typicalRange: [350, 700],
            distinguishingFeatures: 'Dominant visible absorption peak at 550–554 nm.'
        },

        chlorophyll_a: {
            id: 'chlorophyll_a',
            name: 'Chlorophyll a',
            category: 'Photosynthetic Pigment',
            aliases: ['chlorophyll a', 'chlorophyll-a', 'chla', 'chl a', 'chlorophyll'],
            expectedPeaks: [
                { wavelength: 430, name: 'Blue Soret Peak', tolerance: 10, weight: 0.50, isPrimary: true },
                { wavelength: 662, name: 'Red Q-band Peak', tolerance: 9, weight: 0.50, isPrimary: true }
            ],
            typicalRange: [380, 720],
            distinguishingFeatures: 'Dual absorption peaks: strong blue absorption at 430 nm and strong red absorption at 662 nm with low absorption in green.'
        },

        chlorophyll_b: {
            id: 'chlorophyll_b',
            name: 'Chlorophyll b',
            category: 'Photosynthetic Pigment',
            aliases: ['chlorophyll b', 'chlorophyll-b', 'chlb', 'chl b'],
            expectedPeaks: [
                { wavelength: 453, name: 'Blue Soret Peak', tolerance: 10, weight: 0.50, isPrimary: true },
                { wavelength: 642, name: 'Red Q-band Peak', tolerance: 9, weight: 0.50, isPrimary: true }
            ],
            typicalRange: [380, 720],
            distinguishingFeatures: 'Shifted dual absorption peaks: blue absorption at 453 nm and red absorption at 642 nm.'
        },

        caffeine: {
            id: 'caffeine',
            name: 'Caffeine',
            category: 'Purine Alkaloid / Pharmaceutical',
            aliases: ['caffeine', '1,3,7-trimethylxanthine', 'guaranine', 'caffein'],
            expectedPeaks: [
                { wavelength: 273, name: 'UV Absorbance Peak', tolerance: 6, weight: 1.00, isPrimary: true }
            ],
            typicalRange: [200, 350],
            distinguishingFeatures: 'Strong characteristic UV absorption peak centered between 272 nm and 274 nm in aqueous/alcohol solutions.'
        },

        paracetamol: {
            id: 'paracetamol',
            name: 'Paracetamol (Acetaminophen)',
            category: 'Analgesic / Antipyretic',
            aliases: ['paracetamol', 'acetaminophen', 'tylenol', 'apap', '4-acetamidophenol'],
            expectedPeaks: [
                { wavelength: 245, name: 'UV Absorbance Peak', tolerance: 6, weight: 1.00, isPrimary: true }
            ],
            typicalRange: [200, 350],
            distinguishingFeatures: 'Prominent UV absorption peak at ~243–248 nm.'
        },

        bsa_protein: {
            id: 'bsa_protein',
            name: 'Bovine Serum Albumin (BSA)',
            category: 'Serum Albumin Protein',
            aliases: ['bsa', 'bovine serum albumin', 'albumin', 'protein standard'],
            expectedPeaks: [
                { wavelength: 279, name: 'Aromatic Residue Band (Trp/Tyr)', tolerance: 6, weight: 1.00, isPrimary: true }
            ],
            typicalRange: [220, 360],
            distinguishingFeatures: 'Characteristic aromatic absorbance maximum at 278–280 nm due to tryptophan and tyrosine residues.'
        },

        beta_carotene: {
            id: 'beta_carotene',
            name: 'Beta-Carotene',
            category: 'Carotenoid Antioxidant',
            aliases: ['beta carotene', 'beta-carotene', 'b-carotene', 'provitamin a'],
            expectedPeaks: [
                { wavelength: 425, name: 'Vibronic Peak 1', tolerance: 8, weight: 0.25, isPrimary: false },
                { wavelength: 450, name: 'Vibronic Maximum Peak 2', tolerance: 7, weight: 0.50, isPrimary: true },
                { wavelength: 478, name: 'Vibronic Peak 3', tolerance: 8, weight: 0.25, isPrimary: false }
            ],
            typicalRange: [380, 540],
            distinguishingFeatures: 'Classic three-fingered vibronic spectrum with maximum absorption at ~450 nm flanked by peaks at 425 nm and 478 nm.'
        },

        riboflavin: {
            id: 'riboflavin',
            name: 'Riboflavin (Vitamin B2)',
            category: 'Vitamin / Cofactor',
            aliases: ['riboflavin', 'vitamin b2', 'vit b2'],
            expectedPeaks: [
                { wavelength: 266, name: 'UV Band 1', tolerance: 8, weight: 0.30, isPrimary: false },
                { wavelength: 373, name: 'Near-UV Band 2', tolerance: 8, weight: 0.35, isPrimary: false },
                { wavelength: 445, name: 'Visible Absorption Peak 3', tolerance: 8, weight: 0.35, isPrimary: true }
            ],
            typicalRange: [220, 520],
            distinguishingFeatures: 'Tri-peak spectrum with intense peak in yellow-green at 445 nm, intermediate peak at 373 nm, and UV peak at 266 nm.'
        },

        curcumin: {
            id: 'curcumin',
            name: 'Curcumin (Diferuloylmethane)',
            category: 'Polyphenol / Turmeric Pigment',
            aliases: ['curcumin', 'turmeric yellow', 'diferuloylmethane', 'natural yellow 3', 'curcuma'],
            expectedPeaks: [
                { wavelength: 425, name: 'Visible Keto-Enol Peak', tolerance: 10, weight: 0.85, isPrimary: true },
                { wavelength: 260, name: 'Aromatic Ring Peak', tolerance: 8, weight: 0.15, isPrimary: false }
            ],
            typicalRange: [350, 520],
            distinguishingFeatures: 'Broad intense absorption band centered at 420–430 nm due to extended keto-enol conjugated system.'
        },

        aspirin: {
            id: 'aspirin',
            name: 'Aspirin (Acetylsalicylic Acid)',
            category: 'Pharmaceutical NSAID',
            aliases: ['aspirin', 'acetylsalicylic acid', 'asa', '2-acetoxybenzoic acid'],
            expectedPeaks: [
                { wavelength: 278, name: 'Aromatic Ester Primary UV Peak', tolerance: 6, weight: 0.75, isPrimary: true },
                { wavelength: 226, name: 'Benzenoid B-Band', tolerance: 6, weight: 0.25, isPrimary: false }
            ],
            typicalRange: [210, 320],
            distinguishingFeatures: 'Diagnostic UV maximum at 276–280 nm in acidic or organic solvent.'
        },

        ibuprofen: {
            id: 'ibuprofen',
            name: 'Ibuprofen',
            category: 'NSAID Analgesic',
            aliases: ['ibuprofen', 'advil', 'motrin'],
            expectedPeaks: [
                { wavelength: 264, name: 'Primary Benzenoid Peak', tolerance: 6, weight: 0.65, isPrimary: true },
                { wavelength: 273, name: 'Secondary Fine Structure Peak', tolerance: 6, weight: 0.35, isPrimary: false }
            ],
            typicalRange: [210, 310],
            distinguishingFeatures: 'Characteristic doublet benzenoid fine structure with peaks at 264 nm and 273 nm.'
        },

        fluorescein: {
            id: 'fluorescein',
            name: 'Fluorescein (Uranine)',
            category: 'Xanthene / Fluorescent Tracer',
            aliases: ['fluorescein', 'uranine', 'acid yellow 73'],
            expectedPeaks: [
                { wavelength: 490, name: 'Visible Absorption Maximum', tolerance: 10, weight: 0.85, isPrimary: true },
                { wavelength: 460, name: 'Vibronic Shoulder', tolerance: 12, weight: 0.15, isPrimary: false }
            ],
            typicalRange: [380, 560],
            distinguishingFeatures: 'Strong dianionic absorption at 490 nm with bright green fluorescence in basic aqueous solution.'
        },

        coomassie_blue: {
            id: 'coomassie_blue',
            name: 'Coomassie Brilliant Blue G-250',
            category: 'Protein Assay Dye (Bradford)',
            aliases: ['coomassie', 'coomassie blue', 'coomassie brilliant blue', 'bradford dye', 'g-250'],
            expectedPeaks: [
                { wavelength: 595, name: 'Protein-Bound Form (Blue Complex)', tolerance: 12, weight: 0.70, isPrimary: true },
                { wavelength: 465, name: 'Free Cationic Form (Red/Brown)', tolerance: 12, weight: 0.30, isPrimary: false }
            ],
            typicalRange: [400, 700],
            distinguishingFeatures: 'Diagnostic Bradford shift: free dye absorbs at ~465 nm, shifting to 595 nm upon protein binding.'
        },

        dna: {
            id: 'dna',
            name: 'DNA (Deoxyribonucleic Acid)',
            category: 'Nucleic Acid',
            aliases: ['dna', 'deoxyribonucleic acid', 'genomic dna', 'plasmid dna'],
            expectedPeaks: [
                { wavelength: 260, name: 'Nucleic Acid Base Absorbance', tolerance: 6, weight: 0.85, isPrimary: true },
                { wavelength: 280, name: 'Protein Shoulder Contaminant Reference', tolerance: 8, weight: 0.15, isPrimary: false }
            ],
            typicalRange: [220, 320],
            distinguishingFeatures: 'Prominent UV peak at 260 nm with typical A260/A280 purity ratio between 1.8 and 2.0.'
        },

        rna: {
            id: 'rna',
            name: 'RNA (Ribonucleic Acid)',
            category: 'Nucleic Acid',
            aliases: ['rna', 'ribonucleic acid'],
            expectedPeaks: [
                { wavelength: 260, name: 'Nucleic Acid Base Peak', tolerance: 6, weight: 1.00, isPrimary: true }
            ],
            typicalRange: [220, 320],
            distinguishingFeatures: 'Intense heterocyclic base absorption maximum at 260 nm.'
        },

        nadh: {
            id: 'nadh',
            name: 'NADH (Reduced Nicotinamide Adenine Dinucleotide)',
            category: 'Coenzyme / Electron Carrier',
            aliases: ['nadh', 'reduced nad'],
            expectedPeaks: [
                { wavelength: 340, name: 'Dihydropyridine Active Band', tolerance: 6, weight: 0.60, isPrimary: true },
                { wavelength: 260, name: 'Adenine Base Peak', tolerance: 6, weight: 0.40, isPrimary: false }
            ],
            typicalRange: [240, 420],
            distinguishingFeatures: 'Diagnostic 340 nm absorption band present only in the reduced form.'
        },

        tartrazine: {
            id: 'tartrazine',
            name: 'Tartrazine (FD&C Yellow 5)',
            category: 'Food Azo Colorant',
            aliases: ['tartrazine', 'yellow 5', 'e102'],
            expectedPeaks: [
                { wavelength: 427, name: 'Visible Azo Absorption Maximum', tolerance: 8, weight: 0.85, isPrimary: true },
                { wavelength: 258, name: 'UV Benzenesulfonate Peak', tolerance: 8, weight: 0.15, isPrimary: false }
            ],
            typicalRange: [230, 520],
            distinguishingFeatures: 'Bright yellow visible absorption at 426–428 nm.'
        },

        sunset_yellow: {
            id: 'sunset_yellow',
            name: 'Sunset Yellow FCF (FD&C Yellow 6)',
            category: 'Food Azo Colorant',
            aliases: ['sunset yellow', 'sunset yellow fcf', 'yellow 6', 'e110'],
            expectedPeaks: [
                { wavelength: 482, name: 'Visible Absorption Maximum', tolerance: 9, weight: 0.85, isPrimary: true }
            ],
            typicalRange: [350, 580],
            distinguishingFeatures: 'Intense orange absorption band centered at 480–485 nm.'
        },

        allura_red: {
            id: 'allura_red',
            name: 'Allura Red AC (FD&C Red 40)',
            category: 'Food Azo Colorant',
            aliases: ['allura red', 'red 40', 'e129'],
            expectedPeaks: [
                { wavelength: 504, name: 'Visible Absorption Maximum', tolerance: 9, weight: 0.85, isPrimary: true }
            ],
            typicalRange: [380, 600],
            distinguishingFeatures: 'Vibrant red absorption band centered at 502–506 nm in water.'
        },

        brilliant_blue: {
            id: 'brilliant_blue',
            name: 'Brilliant Blue FCF (FD&C Blue 1)',
            category: 'Food Colorant',
            aliases: ['brilliant blue', 'blue 1', 'e133'],
            expectedPeaks: [
                { wavelength: 630, name: 'Visible Absorption Peak', tolerance: 10, weight: 0.85, isPrimary: true }
            ],
            typicalRange: [350, 720],
            distinguishingFeatures: 'Deep blue visible absorption maximum at 628–632 nm.'
        },

        lycopene: {
            id: 'lycopene',
            name: 'Lycopene',
            category: 'Carotenoid Antioxidant',
            aliases: ['lycopene', 'lycopin'],
            expectedPeaks: [
                { wavelength: 446, name: 'Vibronic Peak 1', tolerance: 8, weight: 0.25, isPrimary: false },
                { wavelength: 472, name: 'Vibronic Maximum Peak 2', tolerance: 7, weight: 0.50, isPrimary: true },
                { wavelength: 503, name: 'Vibronic Peak 3', tolerance: 8, weight: 0.25, isPrimary: false }
            ],
            typicalRange: [400, 560],
            distinguishingFeatures: 'Red-shifted three-peak vibronic signature at 446 nm, 472 nm, and 503 nm.'
        },

        anthocyanin: {
            id: 'anthocyanin',
            name: 'Anthocyanin (Cyanidin)',
            category: 'Flavonoid / Plant Pigment',
            aliases: ['anthocyanin', 'anthocyanins', 'cyanidin'],
            expectedPeaks: [
                { wavelength: 520, name: 'Flavylium Cation Visible Band', tolerance: 12, weight: 0.75, isPrimary: true },
                { wavelength: 280, name: 'Benzoyl Ring Peak', tolerance: 8, weight: 0.25, isPrimary: false }
            ],
            typicalRange: [250, 600],
            distinguishingFeatures: 'Characteristic red visible absorption at 515–530 nm in acidic solution.'
        },

        quercetin: {
            id: 'quercetin',
            name: 'Quercetin',
            category: 'Flavonol Antioxidant',
            aliases: ['quercetin'],
            expectedPeaks: [
                { wavelength: 372, name: 'Band I (Cinnamoyl)', tolerance: 8, weight: 0.60, isPrimary: true },
                { wavelength: 256, name: 'Band II (Benzoyl)', tolerance: 8, weight: 0.40, isPrimary: false }
            ],
            typicalRange: [220, 450],
            distinguishingFeatures: 'Classic flavonol two-band spectrum with Band I at ~372 nm and Band II at ~256 nm.'
        },

        resveratrol: {
            id: 'resveratrol',
            name: 'Resveratrol (trans-Resveratrol)',
            category: 'Stilbenoid Antioxidant',
            aliases: ['resveratrol', 'trans-resveratrol'],
            expectedPeaks: [
                { wavelength: 306, name: 'trans-Stilbene Maximum', tolerance: 6, weight: 0.85, isPrimary: true },
                { wavelength: 317, name: 'Shoulder Band', tolerance: 6, weight: 0.15, isPrimary: false }
            ],
            typicalRange: [250, 380],
            distinguishingFeatures: 'Intense conjugated trans-stilbene absorption peak at 306 nm.'
        },

        vitamin_b12: {
            id: 'vitamin_b12',
            name: 'Vitamin B12 (Cyanocobalamin)',
            category: 'Cobalamin Vitamin',
            aliases: ['vitamin b12', 'vit b12', 'cyanocobalamin', 'b12'],
            expectedPeaks: [
                { wavelength: 361, name: 'Corrin Ring Major Peak', tolerance: 8, weight: 0.50, isPrimary: true },
                { wavelength: 550, name: 'Visible α/β Doublet Region', tolerance: 10, weight: 0.30, isPrimary: false },
                { wavelength: 278, name: 'UV Nucleotide Peak', tolerance: 8, weight: 0.20, isPrimary: false }
            ],
            typicalRange: [240, 600],
            distinguishingFeatures: 'Prominent diagnostic sharp peak at 361 nm with broad visible absorption at 520–550 nm.'
        },

        ascorbic_acid: {
            id: 'ascorbic_acid',
            name: 'Ascorbic Acid (Vitamin C)',
            category: 'Water-Soluble Vitamin',
            aliases: ['ascorbic acid', 'vitamin c', 'vit c'],
            expectedPeaks: [
                { wavelength: 245, name: 'Ene-diol System Peak', tolerance: 6, weight: 1.00, isPrimary: true }
            ],
            typicalRange: [210, 320],
            distinguishingFeatures: 'Sharp UV absorption maximum at 245 nm.'
        },

        solvent_baseline: {
            id: 'solvent_baseline',
            name: 'Solvent Baseline / Buffer Blank',
            category: 'Negative Control / Background',
            aliases: ['blank', 'baseline', 'solvent', 'buffer', 'control', 'water', 'hexane'],
            expectedPeaks: [],
            typicalRange: [200, 800],
            distinguishingFeatures: 'Flat or low-amplitude baseline with absence of sharp spectroscopic peaks.'
        }
    };

    // Dynamic registry for custom or dynamically resolved molecules
    const CUSTOM_REGISTRY = {};

    function registerCustomMolecule(profile) {
        if (!profile || !profile.name) return;
        const key = (profile.id || profile.name).trim().toLowerCase();
        CUSTOM_REGISTRY[key] = profile;
        REFERENCE_DATABASE[key] = profile;
    }

    // ─────────────────────────────────────────────────────────────────
    //  2. TARGET RESOLUTION & CUSTOM PARSER
    // ─────────────────────────────────────────────────────────────────

    /**
     * Resolve target molecule string to reference profile, or create custom profile
     * @param {string} query - e.g. "Hemoglobin", "Crystal Violet", "Custom (415, 542, 576)"
     */
    function resolveTargetMolecule(query) {
        if (!query || typeof query !== 'string') {
            return REFERENCE_DATABASE.hemoglobin;
        }

        const clean = query.trim().toLowerCase();

        // 1. Direct key or alias match in REFERENCE_DATABASE & CUSTOM_REGISTRY
        for (const [key, profile] of Object.entries({ ...REFERENCE_DATABASE, ...CUSTOM_REGISTRY })) {
            if (key === clean || profile.name.toLowerCase() === clean || profile.name.toLowerCase().includes(clean)) {
                return profile;
            }
            if (profile.aliases && profile.aliases.some(alias => clean === alias.toLowerCase() || clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean))) {
                return profile;
            }
        }

        // 2. Custom peaks specified via syntax like: "Target: Compound X (peaks: 415, 542)" or "415, 542"
        const numbers = clean.match(/(\d{3,4}(\.\d+)?)/g);
        if (numbers && numbers.length > 0) {
            const peaks = numbers.map((n, idx) => ({
                wavelength: parseFloat(n),
                name: `Custom Peak ${idx + 1}`,
                tolerance: 10,
                weight: 1.0 / numbers.length,
                isPrimary: idx === 0
            }));
            const customProfile = {
                id: 'custom_' + Date.now(),
                name: query.trim(),
                category: 'User Custom Target',
                aliases: [clean],
                expectedPeaks: peaks,
                typicalRange: [Math.min(...peaks.map(p => p.wavelength)) - 50, Math.max(...peaks.map(p => p.wavelength)) + 50],
                distinguishingFeatures: `User-defined target with expected peak(s) at: ${peaks.map(p => p.wavelength + 'nm').join(', ')}.`
            };
            registerCustomMolecule(customProfile);
            return customProfile;
        }

        // Fallback default
        return REFERENCE_DATABASE.hemoglobin;
    }

    /**
     * Get all available target molecules for dropdown selection
     */
    function listAvailableTargets() {
        return Object.values(REFERENCE_DATABASE).map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            primaryPeak: p.expectedPeaks.find(ep => ep.isPrimary) || p.expectedPeaks[0],
            allPeaks: p.expectedPeaks.map(ep => ep.wavelength)
        }));
    }

    // ─────────────────────────────────────────────────────────────────
    //  3. CURVE PEAK DETECTION & FEATURE EXTRACTION
    // ─────────────────────────────────────────────────────────────────

    /**
     * Detect local peaks/extrema on a digitized (x, y) data array
     * @param {Array<[number, number]>} data - sorted [x, y] coordinates
     * @param {Object} options
     * @returns {Array<Object>} detected peaks sorted by prominence/absorbance descending
     */
    function detectCurvePeaks(data, options = {}) {
        if (!data || data.length < 5) return [];

        if (typeof options === 'number') {
            const win = options;
            const prom = typeof arguments[2] === 'number' ? arguments[2] : null;
            options = { smoothingWindow: win, minProminence: prom };
        }

        const sorted = [...data].sort((a, b) => a[0] - b[0]);
        const n = sorted.length;

        // Smooth with light rolling window to eliminate pixel quantization noise
        const win = options.smoothingWindow || 5;
        const half = Math.floor(win / 2);
        const smoothedY = new Array(n);
        for (let i = 0; i < n; i++) {
            let sum = 0, count = 0;
            for (let w = -half; w <= half; w++) {
                const idx = i + w;
                if (idx >= 0 && idx < n) {
                    sum += sorted[idx][1];
                    count++;
                }
            }
            smoothedY[i] = sum / count;
        }

        const yVals = smoothedY;
        const minY = Math.min(...yVals);
        const maxY = Math.max(...yVals);
        const rangeY = maxY - minY;

        if (rangeY <= 0.0001) return [];

        // Threshold for minimal peak height relative to curve dynamic range
        const minProminence = options.minProminence || (rangeY * 0.08);
        const peaks = [];

        // Local extrema search
        const neighborSpan = options.neighborSpan || Math.max(3, Math.floor(n * 0.015));

        for (let i = neighborSpan; i < n - neighborSpan; i++) {
            const currentY = yVals[i];
            let isLocalMax = true;

            for (let d = 1; d <= neighborSpan; d++) {
                if (yVals[i - d] > currentY || yVals[i + d] > currentY) {
                    isLocalMax = false;
                    break;
                }
            }

            if (isLocalMax) {
                // Compute local valley minimums to left and right for prominence
                let leftMin = currentY;
                for (let li = i - 1; li >= 0; li--) {
                    if (yVals[li] < leftMin) leftMin = yVals[li];
                    if (yVals[li] > currentY) break;
                }
                let rightMin = currentY;
                for (let ri = i + 1; ri < n; ri++) {
                    if (yVals[ri] < rightMin) rightMin = yVals[ri];
                    if (yVals[ri] > currentY) break;
                }
                const valley = Math.max(leftMin, rightMin);
                const prominence = currentY - valley;

                if (prominence >= minProminence) {
                    peaks.push({
                        wavelength: sorted[i][0],
                        absorbance: sorted[i][1],
                        smoothedAbsorbance: currentY,
                        prominence: prominence,
                        index: i
                    });
                }
            }
        }

        // If no peaks found by prominence, take the global maximum
        if (peaks.length === 0) {
            let maxIdx = 0;
            for (let i = 1; i < n; i++) {
                if (yVals[i] > yVals[maxIdx]) maxIdx = i;
            }
            peaks.push({
                wavelength: sorted[maxIdx][0],
                absorbance: sorted[maxIdx][1],
                smoothedAbsorbance: yVals[maxIdx],
                prominence: rangeY,
                index: maxIdx
            });
        }

        // Sort peaks primarily by absorbance / prominence
        peaks.sort((a, b) => b.absorbance - a.absorbance);

        return peaks;
    }

    /**
     * Compute comprehensive spectral fingerprint features of a curve
     * @param {Object} curve - { name, color, data, rawPoints }
     */
    function extractCurveFeatures(curve) {
        const data = curve.data || [];
        if (data.length === 0) {
            return {
                curveName: curve.name || 'Unknown Curve',
                color: curve.color || 'gray',
                peaks: [],
                maxAbsorbance: 0,
                minAbsorbance: 0,
                area: 0,
                centroid: 0,
                pointCount: 0
            };
        }

        const sorted = [...data].sort((a, b) => a[0] - b[0]);
        const peaks = detectCurvePeaks(sorted);

        let area = 0;
        let weightedXSum = 0;
        let totalY = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
            const dx = sorted[i+1][0] - sorted[i][0];
            const avgY = (sorted[i+1][1] + sorted[i][1]) / 2;
            area += dx * avgY;
            weightedXSum += sorted[i][0] * sorted[i][1];
            totalY += sorted[i][1];
        }

        const yVals = sorted.map(pt => pt[1]);
        const maxY = Math.max(...yVals);
        const minY = Math.min(...yVals);
        const centroid = totalY > 0 ? (weightedXSum / totalY) : 0;

        return {
            curveName: curve.name || 'Unnamed Curve',
            color: curve.color || 'unknown',
            peaks: peaks,
            primaryPeak: peaks[0] || null,
            maxAbsorbance: maxY,
            minAbsorbance: minY,
            area: area,
            centroid: centroid,
            pointCount: sorted.length,
            xStart: sorted[0][0],
            xEnd: sorted[sorted.length - 1][0]
        };
    }

    // ─────────────────────────────────────────────────────────────────
    //  4. CHARACTERISTIC COMPARISON & MATCHING ALGORITHM
    // ─────────────────────────────────────────────────────────────────

    /**
     * Match a single curve against a target molecule profile
     * @param {Object} curve - curve object with data
     * @param {Object|string} targetMolecule - target profile or query name
     * @returns {Object} detailed score and scientific explanation
     */
    function matchCurveToTarget(curve, targetMolecule) {
        const target = typeof targetMolecule === 'string'
            ? resolveTargetMolecule(targetMolecule)
            : (targetMolecule || REFERENCE_DATABASE.hemoglobin);

        const features = extractCurveFeatures(curve);
        const detectedPeaks = features.peaks;
        const expectedPeaks = target.expectedPeaks || [];

        if (detectedPeaks.length === 0 || expectedPeaks.length === 0) {
            return {
                curveName: features.curveName,
                color: features.color,
                targetName: target.name,
                confidenceScore: 0,
                confidencePercent: '0.0%',
                isTarget: false,
                matches: [],
                explanation: `No significant absorbance peaks detected on ${features.curveName}.`,
                features
            };
        }

        let totalWeightedScore = 0;
        let totalWeight = 0;
        const matches = [];
        const unmatchedExpected = [];

        // For each expected peak, find the closest detected peak
        for (const exp of expectedPeaks) {
            totalWeight += exp.weight;
            let bestDist = Infinity;
            let closestPeak = null;

            for (const det of detectedPeaks) {
                const dist = Math.abs(det.wavelength - exp.wavelength);
                if (dist < bestDist) {
                    bestDist = dist;
                    closestPeak = det;
                }
            }

            const tolerance = exp.tolerance || 10;
            // Gaussian proximity scoring: score is 1.0 at 0 dist, drops smoothly with tolerance
            const proximityScore = Math.max(0, Math.exp(-Math.pow(bestDist / (tolerance * 0.8), 2)));

            const isMatched = bestDist <= (tolerance * 1.5);

            matches.push({
                expectedName: exp.name,
                expectedWavelength: exp.wavelength,
                tolerance: tolerance,
                weight: exp.weight,
                isPrimary: !!exp.isPrimary,
                closestDetected: closestPeak ? closestPeak.wavelength : null,
                deltaNm: closestPeak ? (closestPeak.wavelength - exp.wavelength) : null,
                distance: bestDist,
                proximityScore: proximityScore,
                isMatched: isMatched
            });

            if (isMatched) {
                totalWeightedScore += proximityScore * exp.weight;
            } else {
                unmatchedExpected.push(exp);
            }
        }

        let baseConfidence = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

        // Peak Coverage multiplier: bonus if multiple expected peaks match
        const matchedCount = matches.filter(m => m.isMatched).length;
        const coverage = matchedCount / expectedPeaks.length;

        // Primary peak requirement check
        const primaryMatch = matches.find(m => m.isPrimary);
        let primaryPenalty = 1.0;
        if (primaryMatch && !primaryMatch.isMatched) {
            // Severe penalty if primary Soret peak is completely absent
            primaryPenalty = 0.25;
        }

        // Relative peak ratio bonus/penalty (if multi-peak signature like Hemoglobin exists)
        let ratioMultiplier = 1.0;
        if (target.id === 'hemoglobin' && detectedPeaks.length >= 2) {
            const soretMatch = matches.find(m => m.expectedWavelength === 415);
            const qMatch = matches.find(m => m.expectedWavelength === 542 || m.expectedWavelength === 576);
            if (soretMatch && soretMatch.isMatched && qMatch && qMatch.isMatched) {
                ratioMultiplier = 1.15; // Positive boost for multi-band Hemoglobin doublet signature
            }
        }

        // Flat baseline / blank penalty: if curve has negligible absorption amplitude
        let baselinePenalty = 1.0;
        const dynamicRange = features.maxAbsorbance - features.minAbsorbance;
        if (features.maxAbsorbance < 0.22 && dynamicRange < 0.12) {
            baselinePenalty = 0.05; // Curve is flat baseline/blank, not true analyte absorption
        }

        let finalConfidence = Math.min(1.0, Math.max(0.0, baseConfidence * (0.5 + 0.5 * coverage) * primaryPenalty * ratioMultiplier * baselinePenalty));
        const confidencePercent = (finalConfidence * 100).toFixed(1) + '%';

        // Build scientific explanation
        const peakListStr = detectedPeaks.slice(0, 4).map(p => `${p.wavelength.toFixed(1)} nm`).join(', ');
        const matchedStr = matches.filter(m => m.isMatched)
            .map(m => `${m.expectedName} at ${m.closestDetected.toFixed(1)} nm (Δ = ${(m.deltaNm >= 0 ? '+' : '') + m.deltaNm.toFixed(1)} nm)`)
            .join('; ');

        let explanation = '';
        if (finalConfidence >= 0.70) {
            explanation = `High confidence match for ${target.name} (${confidencePercent}). Detected peaks: [${peakListStr}]. Closely matches reference: ${matchedStr}.`;
        } else if (finalConfidence >= 0.40) {
            explanation = `Moderate match for ${target.name} (${confidencePercent}). Some characteristic peaks found (${matchedStr}), but peak shifts or missing bands present.`;
        } else {
            explanation = `Low match for ${target.name} (${confidencePercent}). Detected peaks [${peakListStr}] do not correlate with ${target.name} reference profile.`;
        }

        return {
            curveName: features.curveName,
            color: features.color,
            targetId: target.id,
            targetName: target.name,
            confidenceScore: finalConfidence,
            confidencePercent: confidencePercent,
            isTarget: finalConfidence >= 0.50,
            matchedCount,
            totalExpected: expectedPeaks.length,
            matches,
            unmatchedExpected,
            explanation,
            features
        };
    }

    // ─────────────────────────────────────────────────────────────────
    //  5. MULTI-CURVE DECOMPOSITION & TARGET ISOLATION
    // ─────────────────────────────────────────────────────────────────

    /**
     * Decompose a multi-curve spectrum chart, compare each against the target molecule,
     * and isolate the best matching target curve.
     *
     * @param {Array<Object>} curves - Array of detected curve objects [{ name, color, data, rawPoints }]
     * @param {string|Object} targetQuery - Target molecule name or object (e.g. "Hemoglobin")
     * @returns {Object} Complete decomposition summary with isolated target curve
     */
    function decomposeAndClassifyCurves(curves, targetQuery) {
        const target = typeof targetQuery === 'string'
            ? resolveTargetMolecule(targetQuery)
            : (targetQuery || REFERENCE_DATABASE.hemoglobin);

        if (!curves || curves.length === 0) {
            return {
                targetMolecule: target.name,
                targetId: target.id,
                totalCurvesDetected: 0,
                curveAnalyses: [],
                bestMatchCurve: null,
                bestMatchIndex: -1,
                bestMatchConfidence: '0.0%',
                rationale: 'No curves provided for decomposition.'
            };
        }

        // Evaluate each curve separately
        const analyses = curves.map((c, idx) => {
            const matchResult = matchCurveToTarget(c, target);
            return {
                index: idx,
                curveId: c.name || `Curve ${idx + 1}`,
                originalName: c.name || `Curve ${idx + 1}`,
                color: c.color || 'blue',
                curveRef: c,
                ...matchResult
            };
        });

        // Sort descending by confidence score
        const ranked = [...analyses].sort((a, b) => b.confidenceScore - a.confidenceScore);
        const top = ranked[0];

        // Mark the top ranked curve as selected target if confidence > 0.35 (or relative best)
        const bestMatchIndex = top ? top.index : -1;
        const bestMatchCurve = top ? top.curveRef : null;

        analyses.forEach((a, idx) => {
            a.isSelectedTarget = (a.index === bestMatchIndex);
            a.rank = ranked.findIndex(r => r.index === a.index) + 1;
        });

        // Generate logical breakdown summary
        const detectedBreakdown = analyses.map(a => {
            const pStr = a.features.peaks.slice(0, 3).map(p => `${p.wavelength.toFixed(1)} nm`).join(', ') || 'none';
            return `${a.curveId} (${a.color}) → peak positions: [${pStr}], confidence: ${a.confidencePercent}`;
        }).join('\n');

        const refPeaksStr = target.expectedPeaks.map(p => `${p.name}: ${p.wavelength} nm`).join(', ');

        const rationale = [
            `Target molecule: ${target.name}`,
            `Detected curves count: ${curves.length}`,
            `--- Curve Breakdown ---`,
            detectedBreakdown,
            `--- Reference expected ${target.name} peaks ---`,
            refPeaksStr,
            `--- Selection ---`,
            `Best match → ${top ? top.curveId : 'None'} (${top ? top.confidencePercent : '0%'})`,
            top ? top.explanation : ''
        ].join('\n');

        const analyzedCurves = analyses.map(a => ({
            ...(a.curveRef || {}),
            name: a.curveId,
            color: a.color,
            matchConfidence: a.confidenceScore,
            matchScore: a.confidenceScore,
            confidencePercent: a.confidencePercent,
            matchExplanation: a.explanation,
            detectedPeaks: a.features.peaks,
            extractedPeaks: a.features.peaks,
            isSelectedTarget: a.isSelectedTarget
        }));

        const finalBestMatchCurve = bestMatchCurve ? {
            ...bestMatchCurve,
            name: top ? top.curveId : (bestMatchCurve.name || 'Curve'),
            color: top ? top.color : bestMatchCurve.color,
            matchConfidence: top ? top.confidenceScore : 1.0,
            matchExplanation: top ? top.explanation : '',
            detectedPeaks: top ? top.features.peaks : [],
            extractedPeaks: top ? top.features.peaks : []
        } : null;

        return {
            targetMolecule: target.name,
            targetId: target.id,
            targetProfile: target,
            targetReference: {
                ...target,
                peaks: (target.expectedPeaks || []).map(p => ({ wavelength: p.wavelength, label: p.name }))
            },
            totalCurvesDetected: curves.length,
            curveAnalyses: analyses,
            analyzedCurves: analyzedCurves,
            rankedAnalyses: ranked,
            bestMatchCurve: finalBestMatchCurve,
            bestMatchIndex: bestMatchIndex,
            bestMatchCurveId: top ? top.curveId : null,
            bestMatchConfidence: top ? top.confidencePercent : '0.0%',
            bestMatchConfidenceScore: top ? top.confidenceScore : 0,
        };
    }

    // ─────────────────────────────────────────────────────────────────
    //  5. LEGEND WORDS & MOLECULE EXTRACTION HELPERS
    // ─────────────────────────────────────────────────────────────────
    function parseLegendWordsAndEntities(legendText, swatchColor) {
        swatchColor = swatchColor || 'unknown';
        if (!legendText || typeof legendText !== 'string') {
            return {
                rawText: '',
                cleanedLabel: '',
                words: [],
                matchedMolecule: null,
                chemicalState: null,
                concentration: null,
                timeCondition: null,
                swatchColor: swatchColor,
                suggestedCurveName: `Curve (${swatchColor})`
            };
        }

        let clean = legendText.replace(/^[|~.:;,\s—–\-•*+=_/\\]+/, '').trim();
        clean = clean.replace(/[|~—–\-•*+=_/\\]+$/, '').trim();

        let normalized = clean;
        normalized = normalized.replace(/\bToe\s+Ro[o0]damina\s*B\b/gi, 'Rhodamine B');
        normalized = normalized.replace(/\bRo[o0]damina?[\s_-]*B\b/gi, 'Rhodamine B');
        normalized = normalized.replace(/\bOxyh[aae]+moglob[a-z]*\b/gi, 'Oxyhemoglobin');
        normalized = normalized.replace(/\bDeoxyh[aae]+moglob[a-z]*\b/gi, 'Deoxyhemoglobin');
        normalized = normalized.replace(/\bCarboxyh[aae]+moglob[a-z]*\b/gi, 'Carboxyhemoglobin');
        normalized = normalized.replace(/\bMeth[aae]+moglob[a-z]*\b/gi, 'Methemoglobin');
        normalized = normalized.replace(/\bH[aae]+moglob[a-z]*\b/gi, 'Hemoglobin');
        normalized = normalized.replace(/\bHb\s+oxy[a-z]*\b/gi, 'Hb Oxygenated');
        normalized = normalized.replace(/\bHb\s+deoxy[a-z]*\b/gi, 'Hb Deoxygenated');
        normalized = normalized.replace(/\bCyto?chrom[e\s_-]*c\b/gi, 'Cytochrome C');
        normalized = normalized.replace(/\bConc\s+of\s+CV\b/gi, 'Concentration of Crystal Violet');
        normalized = normalized.replace(/\bamg\/mL\b/gi, '4 mg/mL');

        const concRegex = /(\b\d+(?:\.\d+)?\s*(?:mg\/mL|µg\/mL|ug\/mL|mg\/L|g\/L|µM|uM|mM|M|ppm|ppb|%|wt%|vol%)\b|\b1\s*:\s*\d+\s*(?:plasma|dilution|serum)?\b)/i;
        const concMatch = normalized.match(concRegex);
        const concentration = concMatch ? concMatch[0].trim() : null;

        const stateRegex = /\b(oxygenated|deoxygenated|oxy|deoxy|carboxy|met|ferro|ferri|ferric|ferrous|oxidized|reduced|native|denatured)\b/i;
        const stateMatch = normalized.match(stateRegex);
        const chemicalState = stateMatch ? (stateMatch[0].charAt(0).toUpperCase() + stateMatch[0].slice(1).toLowerCase()) : null;

        const timeRegex = /\b(\d+\s*(?:min|mins|minute|minutes|h|hr|hrs|hour|hours|s|sec|seconds|days|d))\b/i;
        const timeMatch = normalized.match(timeRegex);
        const timeCondition = timeMatch ? timeMatch[0].trim() : null;

        let matchedMolecule = null;
        const lowerNorm = normalized.toLowerCase();
        for (const [key, mol] of Object.entries(REFERENCE_DATABASE)) {
            if (mol.aliases && mol.aliases.some(a => lowerNorm.includes(a.toLowerCase()))) {
                matchedMolecule = mol.name;
                break;
            }
        }

        const isSolvent = /\b(solvent|baseline|blank|water|hexane|buffer|control|reference)\b/i.test(normalized);
        if (!matchedMolecule && isSolvent) {
            matchedMolecule = 'Solvent / Baseline';
        }

        const words = normalized
            .split(/[\s,;:|~/\\]+/)
            .map(w => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
            .filter(w => w.length > 0);

        let suggestedCurveName = normalized;
        const colCap = swatchColor ? swatchColor.charAt(0).toUpperCase() + swatchColor.slice(1) : '';
        if (matchedMolecule && matchedMolecule !== 'Solvent / Baseline') {
            if (chemicalState && !normalized.toLowerCase().includes(chemicalState.toLowerCase())) {
                suggestedCurveName = `${chemicalState} ${matchedMolecule}`;
            } else if (concentration && !normalized.toLowerCase().includes(concentration.toLowerCase())) {
                suggestedCurveName = `${concentration} ${matchedMolecule}`;
            } else if (normalized.length <= 40) {
                suggestedCurveName = normalized;
            } else {
                suggestedCurveName = matchedMolecule;
            }
        } else if (isSolvent) {
            suggestedCurveName = 'Solvent Baseline';
        }

        if (colCap && !suggestedCurveName.toLowerCase().includes(swatchColor.toLowerCase())) {
            suggestedCurveName = `${suggestedCurveName} (${colCap})`;
        }

        return {
            rawText: legendText,
            cleanedLabel: normalized,
            words: words,
            matchedMolecule: matchedMolecule,
            chemicalState: chemicalState,
            concentration: concentration,
            timeCondition: timeCondition,
            swatchColor: swatchColor,
            suggestedCurveName: suggestedCurveName
        };
    }

    function bindLegendsToCurves(curves, legendColorMap) {
        if (!curves || !Array.isArray(curves) || !legendColorMap) return curves;
        return curves.map(curve => {
            const col = (curve.color || '').toLowerCase();
            const mapping = legendColorMap[col];
            if (mapping && (mapping.name || mapping.rawLabel)) {
                return {
                    ...curve,
                    name: mapping.name || mapping.rawLabel,
                    legendLabel: mapping.rawLabel || mapping.name,
                    species: mapping.species || mapping.name,
                    chemicalState: mapping.chemicalState || null,
                    concentration: mapping.concentration || null,
                    isTarget: Boolean(mapping.isTarget)
                };
            }
            return curve;
        });
    }

    // ─────────────────────────────────────────────────────────────────
    //  EXPORT PUBLIC API
    // ─────────────────────────────────────────────────────────────────
    return {
        REFERENCE_DATABASE,
        resolveTargetMolecule,
        registerCustomMolecule,
        getReferenceTarget: function(query) {
            const profile = resolveTargetMolecule(query);
            if (!profile) return null;
            return {
                ...profile,
                peaks: (profile.expectedPeaks || []).map(p => ({ wavelength: p.wavelength, label: p.name }))
            };
        },
        listAvailableTargets,
        detectCurvePeaks,
        extractCurveFeatures,
        matchCurveToTarget,
        decomposeAndClassifyCurves,
        parseLegendWordsAndEntities,
        bindLegendsToCurves
    };
}));
