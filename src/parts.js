// Every part in the model, keyed by the node name in atrium-heart.glb.
// group decides the material and list section; blood is the blood it carries ('rich' or 'poor');
// inside marks parts hidden within the heart (others fade when one is selected);
// aliases help search.

export const GROUPS = {
  chamber: { label: 'Chamber', plural: 'Chambers' },
  wall: { label: 'Muscle wall', plural: 'Muscle wall' },
  valve: { label: 'Valve', plural: 'Valves' },
  papillary: { label: 'Papillary muscle', plural: 'Papillary muscles' },
  vessel: { label: 'Great vessel', plural: 'Great vessels' },
  coronaryArtery: { label: 'Coronary artery', plural: 'Coronary arteries' },
  cardiacVein: { label: 'Cardiac vein', plural: 'Cardiac veins' },
};

export const GROUP_ORDER = ['chamber', 'valve', 'wall', 'papillary', 'vessel', 'coronaryArtery', 'cardiacVein'];

export const PARTS = {
  right_atrium: { name: 'Right atrium', group: 'chamber', blood: 'poor', aliases: ['RA'] },
  left_atrium: { name: 'Left atrium', group: 'chamber', blood: 'rich', aliases: ['LA'] },
  right_ventricle: { name: 'Right ventricle', group: 'chamber', blood: 'poor', aliases: ['RV'] },
  left_ventricle: { name: 'Left ventricle', group: 'chamber', blood: 'rich', aliases: ['LV', 'apex'] },
  interventricular_septum: { name: 'Interventricular septum', group: 'wall', inside: true, aliases: ['septum'] },

  tricuspid_valve: { name: 'Tricuspid valve', group: 'valve', blood: 'poor', inside: true, aliases: ['right atrioventricular valve', 'AV valve'] },
  pulmonary_valve: { name: 'Pulmonary valve', group: 'valve', blood: 'poor', inside: true, aliases: ['pulmonic', 'semilunar'] },
  mitral_valve: { name: 'Mitral valve', group: 'valve', blood: 'rich', inside: true, aliases: ['bicuspid', 'left atrioventricular valve', 'AV valve'] },
  aortic_valve: { name: 'Aortic valve', group: 'valve', blood: 'rich', inside: true, aliases: ['semilunar'] },

  papillary_anterior: { name: 'Anterior papillary muscle', side: 'right ventricle', group: 'papillary', inside: true },
  papillary_posterior: { name: 'Posterior papillary muscle', side: 'right ventricle', group: 'papillary', inside: true },
  papillary_medial: { name: 'Septal papillary muscle', side: 'right ventricle', group: 'papillary', inside: true, aliases: ['medial'] },
  papillary_anterolateral: { name: 'Anterolateral papillary muscle', side: 'left ventricle', group: 'papillary', inside: true },
  papillary_posteromedial: { name: 'Posteromedial papillary muscle', side: 'left ventricle', group: 'papillary', inside: true },

  superior_vena_cava: { name: 'Superior vena cava', group: 'vessel', blood: 'poor', aliases: ['SVC'] },
  inferior_vena_cava: { name: 'Inferior vena cava', group: 'vessel', blood: 'poor', aliases: ['IVC'] },
  pulmonary_trunk: { name: 'Pulmonary trunk', group: 'vessel', blood: 'poor', aliases: ['pulmonary artery'] },
  pulmonary_artery_left: { name: 'Left pulmonary artery', group: 'vessel', blood: 'poor' },
  pulmonary_artery_right: { name: 'Right pulmonary artery', group: 'vessel', blood: 'poor' },
  pulmonary_vein_right_superior: { name: 'Right superior pulmonary vein', group: 'vessel', blood: 'rich' },
  pulmonary_vein_right_inferior: { name: 'Right inferior pulmonary vein', group: 'vessel', blood: 'rich' },
  pulmonary_vein_left_superior: { name: 'Left superior pulmonary vein', group: 'vessel', blood: 'rich' },
  pulmonary_vein_left_inferior: { name: 'Left inferior pulmonary vein', group: 'vessel', blood: 'rich' },
  ascending_aorta: { name: 'Ascending aorta', group: 'vessel', blood: 'rich', aliases: ['aorta'] },
  aortic_arch: { name: 'Aortic arch', group: 'vessel', blood: 'rich', aliases: ['aorta'] },
  descending_aorta: { name: 'Descending aorta', group: 'vessel', blood: 'rich', aliases: ['aorta'] },
  brachiocephalic_artery: { name: 'Brachiocephalic artery', group: 'vessel', blood: 'rich', aliases: ['innominate'] },
  left_common_carotid_artery: { name: 'Left common carotid artery', group: 'vessel', blood: 'rich', aliases: ['carotid'] },
  left_subclavian_artery: { name: 'Left subclavian artery', group: 'vessel', blood: 'rich' },

  right_coronary_artery: { name: 'Right coronary artery', group: 'coronaryArtery', blood: 'rich', aliases: ['RCA'] },
  right_marginal_artery: { name: 'Right marginal artery', group: 'coronaryArtery', blood: 'rich', aliases: ['acute marginal'] },
  posterior_descending_artery: { name: 'Posterior descending artery', group: 'coronaryArtery', blood: 'rich', aliases: ['PDA', 'posterior interventricular'] },
  left_coronary_artery: { name: 'Left main coronary artery', group: 'coronaryArtery', blood: 'rich', aliases: ['LMCA', 'left coronary'] },
  left_anterior_descending_artery: { name: 'Left anterior descending artery', group: 'coronaryArtery', blood: 'rich', aliases: ['LAD', 'anterior interventricular'] },
  diagonal_branch_1: { name: 'Circumflex artery', group: 'coronaryArtery', blood: 'rich', aliases: ['LCx', 'left circumflex', 'diagonal'] },
  diagonal_branch_2: { name: 'Diagonal branch', group: 'coronaryArtery', blood: 'rich' },
  left_marginal_branch: { name: 'Left marginal branch', group: 'coronaryArtery', blood: 'rich', aliases: ['obtuse marginal'] },

  great_cardiac_vein: { name: 'Great cardiac vein', group: 'cardiacVein', blood: 'poor' },
  middle_cardiac_vein: { name: 'Middle cardiac vein', group: 'cardiacVein', blood: 'poor' },
  small_cardiac_vein: { name: 'Small cardiac vein', group: 'cardiacVein', blood: 'poor' },
  anterior_cardiac_vein: { name: 'Anterior cardiac vein', group: 'cardiacVein', blood: 'poor' },
  posterior_vein_of_left_ventricle: { name: 'Posterior vein of the left ventricle', group: 'cardiacVein', blood: 'poor', aliases: ['posterior cardiac vein'] },
  oblique_vein_of_left_atrium: { name: 'Oblique vein of the left atrium', group: 'cardiacVein', blood: 'poor', aliases: ['vein of Marshall'] },
  coronary_sinus: { name: 'Coronary sinus', group: 'cardiacVein', blood: 'poor' },
};
