"""
How public/models/atrium-heart.glb was made. Not used by the app; kept as a record.

Inputs (Human Reference Atlas, CC BY 4.0), from github.com/hubmapconsortium/ccf-releases (v1.3/models):
  VH_M_Heart.glb              -> saved here as heart.glb
  VH_M_Blood_Vasculature.glb
Steps: pick the heart parts and the vessels around the heart, trim the descending aorta (below y=0.50 m)
and inferior vena cava (below y=0.425 m), drop original materials, centre on the heart, scale x20,
repair the right atrium (merge vertices, drop degenerate faces, orient faces outward by
ray parity, see fix_ra.py), make every mesh face outward, export with normals, then compress:
  python build_model.py atrium-raw.glb --parity
  npx @gltf-transform/cli meshopt atrium-raw.glb atrium-heart.glb
Requires: pip install trimesh
"""
import trimesh, numpy as np
H=trimesh.load('heart.glb'); V=trimesh.load('VH_M_Blood_Vasculature.glb')
def g(scene,name):
    m=scene.geometry[name].copy()
    m.visual=trimesh.visual.ColorVisuals(m)  # drop original material
    return m
heart={
 'right_atrium':'VH_M_right_cardiac_atrium','left_atrium':'VH_M_left_cardiac_atrium',
 'right_ventricle':'VH_M_heart_right_ventricle','left_ventricle':'VH_M_heart_left_ventricle',
 'interventricular_septum':'VH_M_interventricular_septum',
 'tricuspid_valve':'VH_M_tricuspid_valve','pulmonary_valve':'VH_M_pulmonary_valve',
 'mitral_valve':'VH_M_mitral_valve','aortic_valve':'VH_M_aortic_valve',
 'papillary_anterior':'VH_M_papillary_muscle_of_heart_anterior',
 'papillary_anterolateral':'VH_M_papillary_muscle_of_heart_anterolateral',
 'papillary_medial':'VH_M_papillary_muscle_of_heart_medial',
 'papillary_posterior':'VH_M_papillary_muscle_of_heart_posterior',
 'papillary_posteromedial':'VH_M_papillary_muscle_of_heart_posteromedial',
}
vessels={
 'superior_vena_cava':('VH_M_superior_vena_cava',None),
 'inferior_vena_cava':('VH_M_inferior_vena_cava_a',0.425),
 'pulmonary_trunk':('VH_M_pulmonary_trunk',None),
 'pulmonary_artery_left':('VH_M_pulmonary_artery_L',None),
 'pulmonary_artery_right':('VH_M_pulmonary_artery_R',None),
 'pulmonary_vein_right_superior':('VH_M_pulmonary_vein_R_sup',None),
 'pulmonary_vein_right_inferior':('VH_M_pulmonary_vein_R_inf',None),
 'pulmonary_vein_left_superior':('VH_M_pulmonary_vein_L_sup',None),
 'pulmonary_vein_left_inferior':('VH_M_pulmonary_vein_L_inf',None),
 'ascending_aorta':('VH_M_ascending_aorta',None),
 'aortic_arch':('VH_M_aortic_arch',None),
 'descending_aorta':('VH_M_descending_aorta_a',0.50),
 'brachiocephalic_artery':('VH_M_brachiocephalic_artery_a',None),
 'left_common_carotid_artery':('VH_M_left_common_carotid_artery_a',None),
 'left_subclavian_artery':('VH_M_left_subclavian_artery_a',None),
 'right_coronary_artery':('VH_M_right_coronary_artery',None),
 'right_marginal_artery':('VH_M_right_marginal_artery',None),
 'posterior_descending_artery':('VH_M_right_posterior_descending_artery',None),
 'left_coronary_artery':('VH_M_left_coronary_artery',None),
 'left_anterior_descending_artery':('VH_M_left_anterior_descending_artery',None),
 'diagonal_branch_1':('VH_M_diagonal_branch_of_left_anterior_descending_artery',None),
 'diagonal_branch_2':('VH_M_diagonal_branch_of_anterior_descending_branch_of_left_coronary_artery',None),
 'left_marginal_branch':('VH_M_left_marginal_branch',None),
 'great_cardiac_vein':('VH_M_great_cardiac_vein',None),
 'middle_cardiac_vein':('VH_M_middle_cardiac_vein',None),
 'small_cardiac_vein':('VH_M_small_cardiac_vein',None),
 'anterior_cardiac_vein':('VH_M_anterior_cardiac_vein',None),
 'posterior_vein_of_left_ventricle':('VH_M_posterior_vein_of_left_ventricle',None),
 'oblique_vein_of_left_atrium':('VH_M_oblique_vein_of_left_atrium',None),
 'coronary_sinus':('VH_M_coronary_sinus',None),
}
import sys
from fix_ra import orient_by_parity
PARITY='--parity' in sys.argv
meshes={}
for k,n in heart.items(): meshes[k]=g(H,n)
ra=meshes['right_atrium']
if PARITY:
    print('RA flipped', orient_by_parity(ra))
else:
    ra.merge_vertices(digits_vertex=6)
    ra.update_faces(ra.nondegenerate_faces(height=1e-9)); ra.update_faces(ra.unique_faces()); ra.remove_unreferenced_vertices()
for k,(n,ymin) in vessels.items():
    m=g(V,n)
    if ymin is not None:
        keep=m.triangles_center[:,1]>=ymin
        m.update_faces(keep); m.remove_unreferenced_vertices()
    meshes[k]=m
hb=np.vstack([meshes[k].bounds for k in heart])
center=(hb.min(0)+hb.max(0))/2
S=20.0
sc=trimesh.Scene()
for k,m in meshes.items():
    m.merge_vertices()
    outward=(m.area_faces*((m.triangles_center-m.centroid)*m.face_normals).sum(1)).sum()
    if outward<0: m.invert(); print('inverted',k)
    m.apply_translation(-center); m.apply_scale(S); m.fix_normals() if False else None; _=m.vertex_normals
    sc.add_geometry(m,node_name=k,geom_name=k)
print('center',center,'bounds',sc.bounds)
print('tris',sum(len(m.faces) for m in meshes.values()))
sc.export(sys.argv[1] if len(sys.argv)>1 and not sys.argv[1].startswith('--') else 'atrium-raw.glb',include_normals=True)
