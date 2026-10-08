// General notes for "Talk to the heart", in Atrium's own words, checked against the sources listed.
// The chat may only use these and the part notes in facts.js. Edit freely; keep each note short and sourced.

export const KNOWLEDGE_SOURCES = {
  openstax19_1: 'OpenStax, Anatomy and Physiology 2e, 19.1 Heart Anatomy',
  openstax19_2: 'OpenStax, Anatomy and Physiology 2e, 19.2 Cardiac Muscle and Electrical Activity',
  openstax19_3: 'OpenStax, Anatomy and Physiology 2e, 19.3 Cardiac Cycle',
  openstax18_3: 'OpenStax, Anatomy and Physiology 2e, 18.3 Erythrocytes',
  bionumbers: 'BioNumbers 101731 (from Nunn, Applied Respiratory Physiology, 1993)',
  statpearlsDominance: 'StatPearls, Cardiac Dominance',
};

export const KNOWLEDGE = [
  {
    topic: 'The route of blood',
    sources: ['openstax19_1'],
    notes: [
      'Oxygen-poor blood from the body enters the right atrium through the superior and inferior venae cavae, and the heart’s own used blood arrives through the coronary sinus.',
      'It passes through the tricuspid valve into the right ventricle, which pumps it through the pulmonary valve into the pulmonary trunk and the two pulmonary arteries to the lungs.',
      'In the lung capillaries carbon dioxide leaves the blood and oxygen enters.',
      'Oxygen-rich blood returns through the pulmonary veins to the left atrium, passes the mitral valve into the left ventricle, and is pumped through the aortic valve into the aorta and on to the whole body.',
      'The pulmonary arteries are the only arteries after birth that carry oxygen-poor blood, and the pulmonary veins are the only veins that carry oxygen-rich blood.',
      'Both ventricles pump the same amount of blood each beat. The left ventricle’s wall is much thicker because the circuit through the body needs far more pressure than the short circuit through the lungs.',
    ],
  },
  {
    topic: 'Numbers',
    sources: ['openstax19_1'],
    notes: [
      'At 75 beats a minute the heart beats about 108,000 times a day, more than 39 million times a year, and nearly 3 billion times in a 75-year life.',
      'At rest each ventricle ejects roughly 70 mL per beat, about 5 litres a minute.',
      'A typical heart is about the size of a fist: roughly 12 cm long, 8 cm wide and 6 cm thick. A typical male heart weighs about 300 to 350 g and a female heart about 250 to 300 g.',
    ],
  },
  {
    topic: 'One heartbeat (the cardiac cycle)',
    sources: ['openstax19_3', 'openstax19_1'],
    notes: [
      'At 75 beats a minute one beat lasts 0.8 seconds.',
      'The atria contract for about 0.1 seconds. Most ventricular filling, about 70 to 80 percent, happens passively before that; the atrial squeeze adds the last 20 to 30 percent.',
      'The ventricles then contract for about 0.27 seconds. First, for a brief moment, all four valves are shut and pressure rises with no change in volume (isovolumetric contraction). Then the aortic and pulmonary valves open and blood is ejected.',
      'When the ventricles relax, the aortic and pulmonary valves shut, and again for a moment all four valves are shut (isovolumetric relaxation) before the mitral and tricuspid valves open and filling begins again.',
      'As heart rate rises, the resting and filling part of each beat shortens much more than the squeeze does.',
      'Coronary arteries fill mostly while the heart muscle relaxes; while it squeezes it presses its own vessels nearly shut.',
    ],
  },
  {
    topic: 'Heart sounds',
    sources: ['openstax19_3'],
    notes: [
      'The first heart sound, “lub”, comes with the closing of the mitral and tricuspid valves as the ventricles begin to contract.',
      'The second heart sound, “dub”, comes with the closing of the aortic and pulmonary valves as the ventricles relax.',
      'The sounds are linked to the valves closing and the turbulent blood flow as they close, not to the leaflets simply slapping together.',
    ],
  },
  {
    topic: 'The electrical system and the ECG',
    sources: ['openstax19_2'],
    notes: [
      'Each beat starts in the sinoatrial (SA) node, a small group of cells in the wall of the right atrium near where the superior vena cava enters. Its cells slowly leak charge until they fire on their own; nerves and hormones only speed it up or slow it down.',
      'The signal spreads across both atria, which then contract. On the ECG this is the P wave.',
      'The atrioventricular (AV) node holds the signal back for about a tenth of a second, so the atria can finish emptying. This is the flat stretch after the P wave.',
      'The signal then runs down the bundle of His, the left and right bundle branches in the septum, and the Purkinje fibres, which activate both ventricles almost at once. This is the QRS complex, and the ventricles contract just after it.',
      'The T wave is the ventricles recovering electrically. The atria also recover, but that small wave is hidden inside the QRS.',
      'A ring of fibrous tissue between the atria and ventricles blocks the signal everywhere except through the bundle of His.',
    ],
  },
  {
    topic: 'Coronary circulation',
    sources: ['openstax19_1', 'statpearlsDominance'],
    notes: [
      'The right and left coronary arteries leave the aorta just above the aortic valve, so the heart feeds itself first.',
      'In roughly 70 to 80 percent of people the posterior descending artery comes from the right coronary artery; this is called right dominance.',
      'Most of the heart’s used blood drains through the cardiac veins into the coronary sinus and then into the right atrium.',
    ],
  },
  {
    topic: 'Red blood cells',
    sources: ['openstax18_3', 'bionumbers'],
    notes: [
      'A red blood cell (erythrocyte) is a flexible disc about 7 to 8 micrometres across, thinner in the middle than at the edge.',
      'Mature red blood cells have no nucleus and almost no other internal structures, leaving room for hemoglobin.',
      'Each cell holds about 300 million hemoglobin molecules. Each hemoglobin can carry four oxygen molecules, so one cell can carry up to about 1.2 billion.',
      'Red blood cells are made in the red bone marrow, more than 2 million every second.',
      'They circulate for up to about 120 days. Worn-out cells are removed by macrophages, mainly in the bone marrow, liver and spleen; their iron is reused, and the rest of the heme becomes bilirubin.',
      'A microlitre of blood holds about 5.4 million red blood cells in males and about 4.8 million in females.',
      'Oxygen-rich blood is bright red and oxygen-poor blood is darker red. It is never actually blue; blue is only a convention in diagrams, including Atrium.',
      'At rest a red blood cell spends about three quarters of a second passing through a lung capillary, where it picks up oxygen.',
    ],
  },
  {
    topic: 'About Atrium itself',
    sources: [],
    notes: [
      'Atrium’s heart and vessels come from the Human Reference Atlas, made from the Visible Human Male.',
      'The beating motion, valve leaflets, chordae tendineae, conduction pathways, blood particles and ECG are drawn by Atrium and simplified.',
      'Blood in Atrium moves far more slowly than real blood, and the lungs and body are only suggested.',
    ],
  },
];
