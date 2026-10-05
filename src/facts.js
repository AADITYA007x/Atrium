// Hand-written notes for each part, in Atrium's own words, checked against the sources listed.
// does: what it does. fact: one thing worth knowing. connects: linked part ids.
// note: where the model or the science is simplified, uncertain, or our own interpretation.

export const SOURCES = {
  openstax: {
    title: 'OpenStax, Anatomy and Physiology 2e, 19.1 Heart Anatomy',
    url: 'https://openstax.org/books/anatomy-and-physiology/pages/19-1-heart-anatomy',
  },
  openstax2: {
    title: 'OpenStax, Anatomy and Physiology 2e, 19.2 Cardiac Muscle and Electrical Activity',
    url: 'https://openstax.org/books/anatomy-and-physiology/pages/19-2-cardiac-muscle-and-electrical-activity',
  },
  statpearlsDominance: {
    title: 'StatPearls, Cardiac Dominance',
    url: 'https://www.ncbi.nlm.nih.gov/pubmed/30725892',
  },
  statpearlsRCA: {
    title: 'StatPearls, Anatomy, Thorax, Heart Right Coronary Arteries',
    url: 'https://statpearls.com/sp/al/8/28593/',
  },
  radiopaediaRCA: {
    title: 'Radiopaedia, Right coronary artery',
    url: 'https://radiopaedia.org/articles/right-coronary-artery',
  },
  wikiOblique: { title: 'Wikipedia, Oblique vein of the left atrium', url: 'https://en.wikipedia.org/wiki/Oblique_vein_of_the_left_atrium' },
  wikiMitral: { title: 'Wikipedia, Mitral valve', url: 'https://en.wikipedia.org/wiki/Mitral_valve' },
  wikiArch: { title: 'Wikipedia, Aortic arch', url: 'https://en.wikipedia.org/wiki/Aortic_arch' },
  wikiPulmVein: { title: 'Wikipedia, Pulmonary vein', url: 'https://en.wikipedia.org/wiki/Pulmonary_vein' },
  wikiPulmArtery: { title: 'Wikipedia, Pulmonary artery', url: 'https://en.wikipedia.org/wiki/Pulmonary_artery' },
  wikiIVC: { title: 'Wikipedia, Inferior vena cava', url: 'https://en.wikipedia.org/wiki/Inferior_vena_cava' },
  wikiCarotid: { title: 'Wikipedia, Common carotid artery', url: 'https://en.wikipedia.org/wiki/Common_carotid_artery' },
  wikiSubclavian: { title: 'Wikipedia, Subclavian artery', url: 'https://en.wikipedia.org/wiki/Subclavian_artery' },
  wikiBrachio: { title: 'Wikipedia, Brachiocephalic artery', url: 'https://en.wikipedia.org/wiki/Brachiocephalic_artery' },
  hra: { title: 'Human Reference Atlas, Heart, Male (NIH 3D)', url: 'https://3d.nih.gov/entries/3DPX-021000' },
};

const VALVE_MODEL_NOTE =
  'These leaflets are hand-built for Atrium. Their position and size come from the atlas valve, but their shape and motion are simplified: real leaflets are thinner, scalloped, and meet along curved lines.';

const PAPILLARY_FACT =
  'Papillary muscles do not open or close the valve. They tighten as the ventricle squeezes, pulling on tendinous cords (the chordae tendineae, or "heart strings") so the valve flaps cannot be blown back into the atrium, like guy-ropes on a tent.';

const PAPILLARY_NOTE =
  'The atlas names these muscles but not which ventricle each sits in; Atrium assigns them by position. Textbooks describe three in the right ventricle (anterior, posterior, septal) and two in the left.';

const CONDUCTION_NOTE =
  'The conduction system is not part of the atlas model. Atrium draws it from the surrounding anatomy, so positions are estimates and the network is far simpler than the real one.';

const PULM_VEIN_FACT =
  'The pulmonary veins are the only veins after birth that carry oxygen-rich blood, which is why they are red here. Most people have four, but the number varies; some have three or five.';

export const FACTS = {
  right_atrium: {
    does: 'Receives oxygen-poor blood returning from the body through the two venae cavae, and from the heart muscle itself through the coronary sinus, then passes it through the tricuspid valve to the right ventricle.',
    fact: 'The heart\u2019s natural pacemaker, the SA node, sits in the wall of this chamber. Every heartbeat starts here.',
    connects: ['superior_vena_cava', 'inferior_vena_cava', 'coronary_sinus', 'anterior_cardiac_vein', 'tricuspid_valve', 'right_ventricle'],
    sources: ['openstax', 'openstax2'],
  },
  left_atrium: {
    does: 'Receives oxygen-rich blood from the lungs through the pulmonary veins and passes it through the mitral valve to the left ventricle.',
    fact: 'Most of the blood that fills the ventricle simply flows in while everything is relaxed. The atrium\u2019s own squeeze at the end adds roughly the last fifth.',
    connects: ['pulmonary_vein_right_superior', 'pulmonary_vein_right_inferior', 'pulmonary_vein_left_superior', 'pulmonary_vein_left_inferior', 'mitral_valve', 'left_ventricle', 'oblique_vein_of_left_atrium'],
    sources: ['openstax'],
  },
  right_ventricle: {
    does: 'Pumps oxygen-poor blood through the pulmonary valve into the pulmonary trunk and on to the lungs.',
    fact: 'It pumps the same amount of blood per beat as the left ventricle, but its wall is much thinner, because the short trip through the lungs needs far less pressure. Inside it, a strand of muscle called the moderator band helps carry the electrical signal across the chamber.',
    connects: ['tricuspid_valve', 'pulmonary_valve', 'pulmonary_trunk', 'interventricular_septum', 'papillary_anterior', 'papillary_posterior', 'papillary_medial', 'right_marginal_artery'],
    sources: ['openstax'],
  },
  left_ventricle: {
    does: 'The main pump of the body. It sends oxygen-rich blood through the aortic valve into the aorta and on to every organ.',
    fact: 'At rest each ventricle ejects roughly 70 mL per beat. At 75 beats a minute that is about 5 liters a minute, and around 108,000 beats a day.',
    connects: ['mitral_valve', 'aortic_valve', 'ascending_aorta', 'interventricular_septum', 'papillary_anterolateral', 'papillary_posteromedial', 'left_anterior_descending_artery', 'diagonal_branch_1'],
    sources: ['openstax'],
  },
  interventricular_septum: {
    does: 'The muscular wall between the two ventricles. It keeps oxygen-poor and oxygen-rich blood apart and squeezes along with both.',
    fact: 'It is far thicker than the thin wall between the atria, because the ventricles make much higher pressures. The electrical signal for each beat travels down through it toward the apex.',
    connects: ['left_ventricle', 'right_ventricle', 'left_anterior_descending_artery', 'posterior_descending_artery'],
    note: 'In a real heart the septum is part of the ventricular walls. The atlas models it as a separate piece, which lets Atrium show it on its own.',
    sources: ['openstax', 'openstax2', 'hra'],
  },

  tricuspid_valve: {
    does: 'The one-way door between the right atrium and right ventricle. It opens to let the ventricle fill and closes when the ventricle squeezes.',
    fact: 'It usually has three flaps, each tied by tendinous cords to papillary muscles. Its closing, together with the mitral valve\u2019s, makes the first heart sound, the \u201club\u201d.',
    connects: ['right_atrium', 'right_ventricle', 'chordae_tendineae', 'papillary_anterior', 'papillary_posterior', 'papillary_medial'],
    note: VALVE_MODEL_NOTE,
    sources: ['openstax', 'hra'],
  },
  pulmonary_valve: {
    does: 'Lets blood leave the right ventricle for the lungs, then closes so it cannot fall back.',
    fact: 'Its three pocket-shaped cusps need no cords or muscles. When the ventricle relaxes, blood sliding backward fills the pockets and presses them shut. Its closing is part of the second heart sound, the \u201cdub\u201d.',
    connects: ['right_ventricle', 'pulmonary_trunk'],
    note: VALVE_MODEL_NOTE,
    sources: ['openstax', 'hra'],
  },
  mitral_valve: {
    does: 'The one-way door between the left atrium and left ventricle.',
    fact: 'It has two cusps, so it is also called the bicuspid valve. Its name comes from its resemblance to a bishop\u2019s mitre.',
    connects: ['left_atrium', 'left_ventricle', 'chordae_tendineae', 'papillary_anterolateral', 'papillary_posteromedial'],
    note: VALVE_MODEL_NOTE,
    sources: ['openstax', 'wikiMitral', 'hra'],
  },
  aortic_valve: {
    does: 'Lets blood leave the left ventricle for the aorta, then closes to stop it falling back.',
    fact: 'Just above it, the aortic wall bulges into small pouches called sinuses. The two coronary arteries start from two of them, so the heart feeds itself first. In Atrium, two cusps are turned to face those openings.',
    connects: ['left_ventricle', 'ascending_aorta', 'right_coronary_artery', 'left_coronary_artery'],
    note: VALVE_MODEL_NOTE,
    sources: ['openstax', 'hra'],
  },

  chordae_tendineae: {
    does: 'Thin, strong cords that tie the free edges of the mitral and tricuspid valves to the papillary muscles.',
    fact: 'They are about 80% collagen, the same tough protein as tendons, and are sometimes called the heart strings. Pulled tight as the ventricles squeeze, they stop the valve flaps from flipping back into the atria.',
    connects: ['mitral_valve', 'tricuspid_valve', 'papillary_anterolateral', 'papillary_posteromedial', 'papillary_anterior', 'papillary_posterior', 'papillary_medial'],
    note: 'Hand-built for Atrium and not in the atlas: a few straight cords join each leaflet edge to the nearest papillary muscle. Real valves have many more, finer cords that branch as they go.',
    sources: ['openstax'],
  },
  papillary_anterior: {
    does: 'A finger of muscle in the right ventricle that anchors cords from the tricuspid valve.',
    fact: PAPILLARY_FACT,
    connects: ['right_ventricle', 'tricuspid_valve'],
    note: PAPILLARY_NOTE,
    sources: ['openstax', 'hra'],
  },
  papillary_posterior: {
    does: 'A muscle in the lower right ventricle that anchors cords from the tricuspid valve.',
    fact: PAPILLARY_FACT,
    connects: ['right_ventricle', 'tricuspid_valve'],
    note: PAPILLARY_NOTE,
    sources: ['openstax', 'hra'],
  },
  papillary_medial: {
    does: 'A small muscle near the septum in the right ventricle, anchoring cords from the tricuspid valve.',
    fact: PAPILLARY_FACT,
    connects: ['right_ventricle', 'tricuspid_valve', 'interventricular_septum'],
    note: 'The atlas calls this one \u201cmedial\u201d. Its position matches the septal papillary muscle of the right ventricle, so Atrium uses that name. ' + PAPILLARY_NOTE,
    sources: ['openstax', 'hra'],
  },
  papillary_anterolateral: {
    does: 'One of the two large muscles in the left ventricle that anchor cords from the mitral valve.',
    fact: PAPILLARY_FACT,
    connects: ['left_ventricle', 'mitral_valve'],
    note: PAPILLARY_NOTE,
    sources: ['openstax', 'hra'],
  },
  papillary_posteromedial: {
    does: 'The other large muscle in the left ventricle anchoring the mitral valve\u2019s cords.',
    fact: PAPILLARY_FACT,
    connects: ['left_ventricle', 'mitral_valve'],
    note: PAPILLARY_NOTE,
    sources: ['openstax', 'hra'],
  },

  sa_node: {
    does: 'A small cluster of special cells in the wall of the right atrium, near where the superior vena cava enters. It starts every heartbeat.',
    fact: 'Its cells slowly leak charge until they fire on their own, with no signal from the brain needed; nerves and hormones only speed it up or slow it down. In Atrium, watch it brighten slowly between beats, then flash as it fires.',
    connects: ['right_atrium', 'superior_vena_cava', 'internodal_pathways', 'av_node'],
    note: CONDUCTION_NOTE,
    sources: ['openstax2'],
  },
  internodal_pathways: {
    does: 'Carry the signal from the SA node across both atria and down to the AV node. One branch, Bachmann\u2019s bundle, crosses to the left atrium.',
    fact: 'The spreading signal is what draws the small P wave on an ECG: a little bump, because the atria are thin and do not hold much muscle.',
    connects: ['sa_node', 'av_node', 'right_atrium', 'left_atrium'],
    note: 'Whether these are true separate pathways, or simply faster routes through ordinary atrial muscle, is still debated. ' + CONDUCTION_NOTE,
    sources: ['openstax2'],
  },
  av_node: {
    does: 'Sits low in the wall between the atria, near the opening of the coronary sinus. It is the normal gateway for the signal from the atria to the ventricles.',
    fact: 'It deliberately holds the signal back for about a tenth of a second, so the atria can finish emptying before the ventricles squeeze. That pause is the flat stretch between the P wave and the QRS.',
    connects: ['internodal_pathways', 'his_bundle', 'coronary_sinus', 'tricuspid_valve'],
    note: CONDUCTION_NOTE,
    sources: ['openstax2'],
  },
  his_bundle: {
    does: 'Carries the signal from the AV node through the tough ring of tissue between atria and ventricles into the top of the septum.',
    fact: 'That ring of fibrous tissue blocks electricity everywhere else, so this bundle is normally the only way through.',
    connects: ['av_node', 'bundle_branches', 'interventricular_septum'],
    note: CONDUCTION_NOTE,
    sources: ['openstax2'],
  },
  bundle_branches: {
    does: 'A left and a right branch run down either side of the septum toward the apex.',
    fact: 'Because of them, the septum is the first part of the ventricles to be activated, and the apex follows before the base.',
    connects: ['his_bundle', 'purkinje_fibres', 'interventricular_septum'],
    note: CONDUCTION_NOTE,
    sources: ['openstax2'],
  },
  purkinje_fibres: {
    does: 'A network of fast-conducting fibres spread under the inner lining of both ventricles.',
    fact: 'They carry the signal many times faster than ordinary heart muscle, so both ventricles are activated within about a tenth of a second. That speed is why the QRS is narrow, and its size reflects how much muscle the ventricles hold.',
    connects: ['bundle_branches', 'left_ventricle', 'right_ventricle', 'papillary_anterolateral', 'papillary_anterior'],
    note: CONDUCTION_NOTE,
    sources: ['openstax2'],
  },
  superior_vena_cava: {
    does: 'Brings oxygen-poor blood down into the right atrium.',
    fact: 'Everything above the diaphragm drains into it: the head, neck, arms and chest.',
    connects: ['right_atrium'],
    sources: ['openstax'],
  },
  inferior_vena_cava: {
    does: 'Brings oxygen-poor blood up into the right atrium from everything below the diaphragm: the legs, abdomen and pelvis.',
    fact: 'It is the largest vein in the body.',
    connects: ['right_atrium'],
    note: 'Trimmed just below the heart in this model.',
    sources: ['openstax', 'wikiIVC'],
  },
  pulmonary_trunk: {
    does: 'Carries oxygen-poor blood from the right ventricle toward the lungs, then splits into the left and right pulmonary arteries.',
    fact: 'Together with its branches it is the only artery after birth that carries oxygen-poor blood. That is why it is blue here, even though it is an artery.',
    connects: ['pulmonary_valve', 'right_ventricle', 'pulmonary_artery_left', 'pulmonary_artery_right'],
    sources: ['openstax'],
  },
  pulmonary_artery_left: {
    does: 'Carries oxygen-poor blood into the left lung.',
    fact: 'It branches again and again until it reaches tiny capillaries wrapped around the air sacs, where carbon dioxide leaves the blood and oxygen enters.',
    connects: ['pulmonary_trunk'],
    sources: ['openstax'],
  },
  pulmonary_artery_right: {
    does: 'Carries oxygen-poor blood into the right lung.',
    fact: 'It is longer than the left one, passing behind the ascending aorta and the superior vena cava on its way to the right lung.',
    connects: ['pulmonary_trunk', 'ascending_aorta', 'superior_vena_cava'],
    sources: ['openstax', 'wikiPulmArtery'],
  },
  pulmonary_vein_right_superior: {
    does: 'Brings oxygen-rich blood from the upper right lung to the left atrium.',
    fact: PULM_VEIN_FACT,
    connects: ['left_atrium'],
    sources: ['openstax', 'wikiPulmVein'],
  },
  pulmonary_vein_right_inferior: {
    does: 'Brings oxygen-rich blood from the lower right lung to the left atrium.',
    fact: PULM_VEIN_FACT,
    connects: ['left_atrium'],
    sources: ['openstax', 'wikiPulmVein'],
  },
  pulmonary_vein_left_superior: {
    does: 'Brings oxygen-rich blood from the upper left lung to the left atrium.',
    fact: PULM_VEIN_FACT,
    connects: ['left_atrium'],
    sources: ['openstax', 'wikiPulmVein'],
  },
  pulmonary_vein_left_inferior: {
    does: 'Brings oxygen-rich blood from the lower left lung to the left atrium.',
    fact: PULM_VEIN_FACT,
    connects: ['left_atrium'],
    sources: ['openstax', 'wikiPulmVein'],
  },
  ascending_aorta: {
    does: 'The first stretch of the body\u2019s main artery, rising from the left ventricle.',
    fact: 'Its very first branches are the two coronary arteries, which feed the heart muscle itself.',
    connects: ['aortic_valve', 'aortic_arch', 'right_coronary_artery', 'left_coronary_artery'],
    sources: ['openstax'],
  },
  aortic_arch: {
    does: 'Curves up and over to the left, sending branches to the head and arms before turning down.',
    fact: 'In most people three large arteries leave its top: the brachiocephalic, the left common carotid and the left subclavian. Other branching patterns exist and are fairly common.',
    connects: ['ascending_aorta', 'descending_aorta', 'brachiocephalic_artery', 'left_common_carotid_artery', 'left_subclavian_artery'],
    sources: ['wikiArch'],
  },
  descending_aorta: {
    does: 'Carries oxygen-rich blood down through the chest toward the abdomen and legs.',
    fact: 'It runs close to the spine, behind the heart.',
    connects: ['aortic_arch'],
    note: 'Trimmed a little below the arch in this model.',
    sources: ['wikiArch'],
  },
  brachiocephalic_artery: {
    does: 'Supplies the right arm and the right side of the head and neck.',
    fact: 'There is only one, on the right. It splits into the right subclavian and right common carotid arteries; on the left, those two leave the arch separately.',
    connects: ['aortic_arch'],
    note: 'Only its first stretch is in this model.',
    sources: ['wikiBrachio'],
  },
  left_common_carotid_artery: {
    does: 'Supplies the left side of the head and neck.',
    fact: 'In the neck it divides into the internal carotid, which supplies much of the brain, and the external carotid, which supplies the face and scalp.',
    connects: ['aortic_arch'],
    note: 'Only its first stretch is in this model.',
    sources: ['wikiCarotid'],
  },
  left_subclavian_artery: {
    does: 'Supplies the left arm.',
    fact: 'One of its branches, the vertebral artery, climbs up through the neck bones to help supply the back of the brain.',
    connects: ['aortic_arch'],
    note: 'Only its first stretch is in this model.',
    sources: ['wikiSubclavian'],
  },

  right_coronary_artery: {
    does: 'Runs in the groove between the right atrium and right ventricle, supplying the right atrium, much of the right ventricle, and parts of the left ventricle and septum.',
    fact: 'In about 60% of people one of its first branches feeds the SA node, the heart\u2019s natural pacemaker. In the rest, that branch comes from the left side.',
    connects: ['ascending_aorta', 'aortic_valve', 'right_marginal_artery', 'posterior_descending_artery', 'small_cardiac_vein'],
    sources: ['openstax', 'radiopaediaRCA', 'statpearlsRCA'],
  },
  right_marginal_artery: {
    does: 'Runs along the sharp lower-right edge of the heart, supplying the right ventricle.',
    fact: 'That edge is called the acute margin, so this vessel is also called the acute marginal artery.',
    connects: ['right_coronary_artery', 'right_ventricle'],
    sources: ['openstax', 'radiopaediaRCA'],
  },
  posterior_descending_artery: {
    does: 'Runs in the groove on the underside of the heart toward the apex, supplying the back third of the septum and the underside of both ventricles.',
    fact: 'Which artery feeds it defines coronary \u201cdominance\u201d. In roughly 70 to 80% of people it comes from the right coronary artery, as it appears to in this model.',
    connects: ['right_coronary_artery', 'interventricular_septum', 'middle_cardiac_vein'],
    sources: ['openstax', 'statpearlsDominance'],
  },
  left_coronary_artery: {
    does: 'A short trunk from the aorta that soon divides into the left anterior descending and circumflex arteries.',
    fact: 'Short as it is, it feeds most of the left side of the heart, including the hardest-working chamber.',
    connects: ['ascending_aorta', 'aortic_valve', 'left_anterior_descending_artery', 'diagonal_branch_1'],
    sources: ['openstax'],
  },
  left_anterior_descending_artery: {
    does: 'Runs down the front groove between the ventricles toward the apex, supplying the front of the left ventricle and much of the septum.',
    fact: 'Coronary arteries fill mostly while the heart relaxes. While the muscle squeezes, it presses its own vessels nearly shut.',
    connects: ['left_coronary_artery', 'diagonal_branch_2', 'great_cardiac_vein', 'left_ventricle', 'interventricular_septum'],
    sources: ['openstax'],
  },
  diagonal_branch_1: {
    does: 'Curves left from the left main artery, following the groove between the left atrium and left ventricle around toward the back of the heart.',
    fact: 'Its branches down the left side of the heart are called marginal (or obtuse marginal) branches.',
    connects: ['left_coronary_artery', 'left_marginal_branch', 'left_ventricle', 'left_atrium', 'great_cardiac_vein'],
    note: 'The atlas labels this vessel a \u201cdiagonal branch of the left anterior descending artery\u201d. Its path, curving around the left side in the groove between atrium and ventricle, matches the circumflex artery, so Atrium names it that. This is our reading of its shape, not the atlas\u2019s label.',
    sources: ['openstax', 'hra'],
  },
  diagonal_branch_2: {
    does: 'Branches off the left anterior descending artery and spreads across the front of the left ventricle.',
    fact: 'Most people have one or more diagonal branches; how many varies from person to person.',
    connects: ['left_anterior_descending_artery', 'left_ventricle'],
    sources: ['openstax'],
  },
  left_marginal_branch: {
    does: 'Runs down the left side of the left ventricle, supplying its outer wall.',
    fact: 'It is also called an obtuse marginal branch, after the rounded left border of the heart.',
    connects: ['diagonal_branch_1', 'left_ventricle', 'posterior_vein_of_left_ventricle'],
    note: 'In this model it joins the vessel Atrium names the circumflex artery, which fits that reading.',
    sources: ['openstax', 'hra'],
  },

  great_cardiac_vein: {
    does: 'Collects used blood from the front of the heart, running up beside the left anterior descending artery, then around the left side to the coronary sinus.',
    fact: 'Heart veins mostly shadow the arteries: this one drains the same territory its partner artery supplies.',
    connects: ['left_anterior_descending_artery', 'coronary_sinus'],
    sources: ['openstax'],
  },
  middle_cardiac_vein: {
    does: 'Runs alongside the posterior descending artery on the underside of the heart and drains into the coronary sinus.',
    fact: 'It drains the same region that the posterior descending artery supplies.',
    connects: ['posterior_descending_artery', 'coronary_sinus'],
    sources: ['openstax'],
  },
  small_cardiac_vein: {
    does: 'Runs alongside the right coronary artery, draining the back of the right atrium and right ventricle.',
    fact: 'It joins the coronary sinus near its opening into the right atrium.',
    connects: ['right_coronary_artery', 'coronary_sinus'],
    sources: ['openstax'],
  },
  anterior_cardiac_vein: {
    does: 'Drains the front surface of the right ventricle.',
    fact: 'Unlike the other heart veins, it skips the coronary sinus and empties straight into the right atrium.',
    connects: ['right_atrium', 'right_ventricle'],
    sources: ['openstax'],
  },
  posterior_vein_of_left_ventricle: {
    does: 'Drains the back of the left ventricle into the coronary sinus.',
    fact: 'It runs with the marginal branches of the circumflex artery and drains the area they supply.',
    connects: ['coronary_sinus', 'left_marginal_branch'],
    sources: ['openstax'],
  },
  oblique_vein_of_left_atrium: {
    does: 'A small vein running down the back of the left atrium into the coronary sinus.',
    fact: 'It is a leftover from the embryo. Early in development there is a left as well as a right superior vena cava; normally only this small vein remains of the left one.',
    connects: ['left_atrium', 'coronary_sinus'],
    sources: ['wikiOblique'],
  },
  coronary_sinus: {
    does: 'A wide, thin-walled vein in the groove at the back of the heart. It collects most of the heart\u2019s own used blood and empties it into the right atrium.',
    fact: 'About 5% of the blood the heart pumps goes to feed the heart itself, and most of it comes back through here.',
    connects: ['right_atrium', 'great_cardiac_vein', 'middle_cardiac_vein', 'small_cardiac_vein', 'posterior_vein_of_left_ventricle', 'oblique_vein_of_left_atrium'],
    sources: ['openstax', 'statpearlsRCA'],
  },
};
