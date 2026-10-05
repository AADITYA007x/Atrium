import trimesh,numpy as np,time
def orient_by_parity(g, eps=1e-6):
    g.merge_vertices(digits_vertex=6)
    g.update_faces(g.nondegenerate_faces(height=1e-9)); g.update_faces(g.unique_faces()); g.remove_unreferenced_vertices()
    n=g.face_normals; c=g.triangles_center
    votes=np.zeros(len(g.faces))
    rng=np.random.default_rng(1)
    for k in range(1):
        d=n+rng.normal(scale=0.15,size=n.shape); d/=np.linalg.norm(d,axis=1,keepdims=True)
        d*=np.sign((d*n).sum(1))[:,None]
        o=c+d*eps*5
        cnt=np.zeros(len(o),dtype=int)
        for a in range(0,len(o),2000):
            ti,ri=g.ray.intersects_id(o[a:a+2000],d[a:a+2000],multiple_hits=True)
            cnt[a:a+2000]+=np.bincount(ri,minlength=min(2000,len(o)-a))
        votes+=np.where(cnt%2==0,1,-1)
    flip=votes<0
    f=g.faces.copy(); f[flip]=f[flip][:,::-1]; g.faces=f
    return flip.sum()
if __name__=='__main__':
    H=trimesh.load('heart.glb'); g=H.geometry['VH_M_right_cardiac_atrium'].copy()
    t=time.time(); print('flipped',orient_by_parity(g),'in',round(time.time()-t,1),'s')
    print('vol',g.volume,'wind',g.is_winding_consistent)
