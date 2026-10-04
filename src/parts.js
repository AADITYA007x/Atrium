// Every part in the model, keyed by the node name in atrium-heart.glb.
// group decides the material; blood is the colour of blood the part carries ('rich' or 'poor').

export const GROUPS = {
  chamber: { label: 'Chamber' },
  wall: { label: 'Muscle wall' },
  valve: { label: 'Valve' },
  papillary: { label: 'Papillary muscle' },
  vessel: { label: 'Great vessel' },
  coronaryArtery: { label: 'Coronary artery' },
  cardiacVein: { label: 'Cardiac vein' },
};

export const PARTS = {
  right_atrium: { name: 'Right atrium', group: 'chamber', blood: 'poor' },
  left_atrium: { name: 'Left atrium', group: 'chamber', blood: 'rich' },
  right_ventricle: { name: 'Right ventricle', group: 'chamber', blood: 'poor' },
  left_ventricle: { name: 'Left ventricle', group: 'chamber', blood: 'rich' },
  interventricular_septum: { name: 'Interventricular septum', group: 'wall' },

  tricuspid_valve: { name: 'Tricuspid valve', group: 'valve', blood: 'poor' },
  pulmonary_valve: { name: 'Pulmonary valve', group: 'valve', blood: 'poor' },
  mitral_valve: { name: 'Mitral valve', group: 'valve', blood: 'rich' },
  aortic_valve: { name: 'Aortic valve', group: 'valve', blood: 'rich' },

  papillary_anterior: { name: 'Anterior papillary muscle', side: 'right ventricle', group: 'papillary' },
  papillary_posterior: { name: 'Posterior papillary muscle', side: 'right ventricle', group: 'papillary' },
  papillary_medial: { name: 'Medial papillary muscle', side: 'right ventricle', group: 'papillary' },
  papillary_anterolateral: { name: 'Anterolateral papillary muscle', side: 'left ventricle', group: 'papillary' },
  papillary_posteromedial: { name: 'Posteromedial papillary muscle', side: 'left ventricle', group: 'papillary' },

  superior_vena_cava: { name: 'Superior vena cava', group: 'vessel', blood: 'poor' },
  inferior_vena_cava: { name: 'Inferior vena cava', group: 'vessel', blood: 'poor' },
  pulmonary_trunk: { name: 'Pulmonary trunk', group: 'vessel', blood: 'poor' },
  pulmonary_artery_left: { name: 'Left pulmonary artery', group: 'vessel', blood: 'poor' },
  pulmonary_artery_right: { name: 'Right pulmonary artery', group: 'vessel', blood: 'poor' },
  pulmonary_vein_right_superior: { name: 'Right superior pulmonary vein', group: 'vessel', blood: 'rich' },
  pulmonary_vein_right_inferior: { name: 'Right inferior pulmonary vein', group: 'vessel', blood: 'rich' },
  pulmonary_vein_left_superior: { name: 'Left superior pulmonary vein', group: 'vessel', blood: 'rich' },
  pulmonary_vein_left_inferior: { name: 'Left inferior pulmonary vein', group: 'vessel', blood: 'rich' },
  ascending_aorta: { name: 'Ascending aorta', group: 'vessel', blood: 'rich' },
  aortic_arch: { name: 'Aortic arch', group: 'vessel', blood: 'rich' },
  descending_aorta: { name: 'Descending aorta', group: 'vessel', blood: 'rich' },
  brachiocephalic_artery: { name: 'Brachiocephalic artery', group: 'vessel', blood: 'rich' },
  left_common_carotid_artery: { name: 'Left common carotid artery', group: 'vessel', blood: 'rich' },
  left_subclavian_artery: { name: 'Left subclavian artery', group: 'vessel', blood: 'rich' },

  right_coronary_artery: { name: 'Right coronary artery', group: 'coronaryArtery', blood: 'rich' },
  right_marginal_artery: { name: 'Right marginal artery', group: 'coronaryArtery', blood: 'rich' },
  posterior_descending_artery: { name: 'Posterior descending artery', group: 'coronaryArtery', blood: 'rich' },
  left_coronary_artery: { name: 'Left main coronary artery', group: 'coronaryArtery', blood: 'rich' },
  left_anterior_descending_artery: { name: 'Left anterior descending artery', group: 'coronaryArtery', blood: 'rich' },
  diagonal_branch_1: { name: 'Diagonal branch', group: 'coronaryArtery', blood: 'rich' },
  diagonal_branch_2: { name: 'Diagonal branch', group: 'coronaryArtery', blood: 'rich' },
  left_marginal_branch: { name: 'Left marginal branch', group: 'coronaryArtery', blood: 'rich' },

  great_cardiac_vein: { name: 'Great cardiac vein', group: 'cardiacVein', blood: 'poor' },
  middle_cardiac_vein: { name: 'Middle cardiac vein', group: 'cardiacVein', blood: 'poor' },
  small_cardiac_vein: { name: 'Small cardiac vein', group: 'cardiacVein', blood: 'poor' },
  anterior_cardiac_vein: { name: 'Anterior cardiac vein', group: 'cardiacVein', blood: 'poor' },
  posterior_vein_of_left_ventricle: { name: 'Posterior vein of the left ventricle', group: 'cardiacVein', blood: 'poor' },
  oblique_vein_of_left_atrium: { name: 'Oblique vein of the left atrium', group: 'cardiacVein', blood: 'poor' },
  coronary_sinus: { name: 'Coronary sinus', group: 'cardiacVein', blood: 'poor' },
};
