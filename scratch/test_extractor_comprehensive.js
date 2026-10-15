const path = require('path');
const fs = require('fs');
const { extractMetadataAndLegends } = require('../ai_module/legend_and_molecule_extractor');

async function testAllImages() {
  const testImages = [
    {
      file: path.join(__dirname, '..', 'crystalvoilet', 'The absorbance of crystal violetAOTwaterhexane at X 3, X 8, X 15.png'),
      expected: 'Crystal Violet'
    },
    {
      file: path.join(__dirname, '..', 'crystalvoilet', 'crystal voilet (1).png'),
      expected: 'Crystal Violet'
    },
    {
      file: path.join(__dirname, '..', 'crystalvoilet', 'gpt.jpg'),
      expected: 'Hemoglobin'
    },
    {
      file: path.join(__dirname, '..', 'uploads', 'spectrum_1784711204298_1.png'),
      expected: 'Hemoglobin'
    },
    {
      file: path.join(__dirname, '..', 'crystalvoilet', 'gpt5.jpg'),
      expected: 'Methylene Blue'
    },
    {
      file: path.join(__dirname, '..', 'crystalvoilet', 'gpt6.jpg'),
      expected: 'Rhodamine B'
    },
    {
      file: path.join(__dirname, '..', 'crystalvoilet', 'gpt7.jpg'),
      expected: 'Bovine Serum Albumin'
    },
    {
      file: path.join(__dirname, '..', 'test_data', 'mixed_charts', 'mixed_01_hemoglobin_3curves.png'),
      expected: 'Hemoglobin'
    },
    {
      file: path.join(__dirname, '..', 'test_data', 'mixed_charts', 'mixed_03_cytochrome_c_3curves.png'),
      expected: 'Cytochrome C'
    },
    {
      file: path.join(__dirname, '..', 'test_data', 'mixed_charts', 'mixed_04_crystal_violet_4curves.png'),
      expected: 'Crystal Violet'
    }
  ];

  console.log('===============================================================');
  console.log('   🧪 VALIDATING LEGEND AND MOLECULE EXTRACTION ENGINE');
  console.log('===============================================================\n');

  let passed = 0;
  for (const item of testImages) {
    if (!fs.existsSync(item.file)) {
      console.log(`⚠️ Skipped missing file: ${path.basename(item.file)}`);
      continue;
    }
    const name = path.basename(item.file);
    const result = await extractMetadataAndLegends(item.file, name);

    const isMatch = result.targetMolecule && result.targetMolecule.toLowerCase().includes(item.expected.toLowerCase());
    if (isMatch) {
      passed++;
      console.log(`✅ [PASS] ${name}`);
      console.log(`   Target Molecule: "${result.targetMolecule}" (Confidence: ${(result.confidence * 100).toFixed(1)}%, Source: ${result.source})`);
      if (result.legends.length > 0) {
        console.log(`   Detected Legends (${result.legends.length}):`);
        result.legends.forEach(l => console.log(`     - [${l.color}] -> "${l.label}" ${l.matchedMolecule ? `(${l.matchedMolecule})` : ''}`));
      }
      if (result.detectedPeaks.length > 0) {
        console.log(`   Detected Peak Annotations: ${result.detectedPeaks.join(', ')} nm`);
      }
    } else {
      console.log(`❌ [FAIL] ${name}`);
      console.log(`   Expected: "${item.expected}", Got: "${result.targetMolecule}" (Source: ${result.source})`);
    }
    console.log('---------------------------------------------------------------');
  }

  console.log(`\nResults: ${passed} / ${testImages.length} passed.`);
  process.exit(passed === testImages.length ? 0 : 1);
}

testAllImages().catch(err => {
  console.error(err);
  process.exit(1);
});
