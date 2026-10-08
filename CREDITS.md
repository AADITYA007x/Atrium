# Credits

Atrium is an educational project. It does not give medical advice.

## 3D models

- **Heart, Male (v1.2)**, Human Reference Atlas 3D Reference Object Library (HuBMAP).
  Created from the Visible Human Male, National Library of Medicine (Spitzer et al. 1996; Ackerman 1998).
  License: CC BY 4.0. https://3d.nih.gov/entries/3DPX-021000
- **Blood Vasculature, Male**, Human Reference Atlas 3D Reference Object Library (HuBMAP).
  Created from the Visible Human Dataset, National Library of Medicine (Spitzer and Whitlock 2002).
  License: CC BY 4.0. https://3d.nih.gov/entries/3DPX-020997
- Source files: https://github.com/hubmapconsortium/ccf-releases (v1.3/models)

Changes made for Atrium: the 14 heart parts and 30 vessels around the heart were combined into one
file; the descending aorta and inferior vena cava were trimmed; the model was recentred and scaled;
original materials were replaced with Atrium's colours; the right atrium mesh was repaired
(duplicate and degenerate triangles removed, faces turned outward) so slicing shades it correctly; the file was compressed (meshopt). Part names
were made readable. See tools/build_model.py.

## Fonts

- Cormorant Garamond by Christian Thalmann, SIL Open Font License 1.1, via Google Fonts.

## Software

- three.js (MIT License), including its GLTFLoader, OrbitControls, RoomEnvironment and meshopt decoder
- Vite (MIT License)

## Facts

All part descriptions are written for Atrium in its own words (src/facts.js) and checked against:

- OpenStax, Anatomy and Physiology 2e, chapter 19 (19.1 Heart Anatomy; 19.2 Cardiac Muscle and
  Electrical Activity; 19.3 Cardiac Cycle) and 18.3 Erythrocytes.
  https://openstax.org/books/anatomy-and-physiology/pages/19-1-heart-anatomy
  No OpenStax text or images are reproduced, and no OpenStax text is sent to the AI model.
- BioNumbers 101731: red blood cell transit time in a lung capillary (from Nunn, Applied
  Respiratory Physiology, 1993). https://bionumbers.hms.harvard.edu/bionumber.aspx?id=101731
- StatPearls (NCBI Bookshelf): Cardiac Dominance; Anatomy, Thorax, Heart Right Coronary Arteries.
- Radiopaedia: Right coronary artery.
- Wikipedia: Mitral valve, Aortic arch, Pulmonary vein, Pulmonary artery, Inferior vena cava,
  Brachiocephalic artery, Common carotid artery, Subclavian artery, Oblique vein of the left atrium.

Each part's panel in the app links the sources used for it. General notes used by the chat
(cardiac cycle, heart sounds, ECG, blood route, red blood cells) are in src/knowledge.js, with
their sources.

## Talk to the heart

Answers are written by Google Gemini through the Gemini API, called from Atrium's own Cloudflare
Worker (worker/index.js). The model is told to use only Atrium's notes (src/facts.js and
src/knowledge.js), to say when it does not know, and never to give medical advice. It can still
make mistakes, and the app says so.

Interpretations made by Atrium (also stated in the app):
- The atlas vessel named "diagonal branch of left anterior descending artery" is shown as the
  circumflex artery, because its course matches the circumflex.
- The atlas "medial" papillary muscle is shown as the septal papillary muscle of the right ventricle.
- Papillary muscles are assigned to a ventricle by their position in the model.
