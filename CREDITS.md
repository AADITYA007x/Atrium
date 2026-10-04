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
original materials were replaced with Atrium's colours; the file was compressed (meshopt). Part names
were made readable. See tools/build_model.py.

## Fonts

- Cormorant Garamond by Christian Thalmann, SIL Open Font License 1.1, via Google Fonts.

## Software

- three.js (MIT License), including its GLTFLoader, OrbitControls, RoomEnvironment and meshopt decoder
- Vite (MIT License)

## Facts

Each fact in the app will list its source here and in the info panel.
