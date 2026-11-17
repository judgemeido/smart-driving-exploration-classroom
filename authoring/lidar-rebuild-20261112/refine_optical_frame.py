"""Incremental clearance refinement matching build_lidar.py's open optical frame."""
import bpy,bmesh,pathlib
from mathutils import Vector
out=pathlib.Path(__file__).parent
s=bpy.data.scenes['LD016_Engineering'];bpy.context.window.scene=s;s.frame_set(1)
rotor=bpy.data.objects['rotor_head'];collection=bpy.data.collections['LD016_Model']
old=next(o for o in rotor.children if o.type=='MESH' and 'Anodised_Graphite' in o.name)
bm=bmesh.new();bm.from_mesh(old.data)
verts=[]
for vert in bm.verts:
    p=old.matrix_world@vert.co
    if .0144<p.x<.0216 and abs(p.y)<.0141 and .0329<p.z<.0711:verts.append(vert)
assert len(verts)>20, 'Expected the original solid mount component'
bmesh.ops.delete(bm,geom=verts,context='VERTS');bm.to_mesh(old.data);bm.free();old.data.update()
new=[]
for xyz,dim in [((18,y,52),(7,1.2,38)) for y in [-13,0,13]]+[((18,0,z),(7,27.2,1.6)) for z in [34.2,71.9]]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=Vector(xyz)*.001);o=bpy.context.object;o.dimensions=Vector(dim)*.001;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(o.users_collection):c.objects.unlink(o)
    collection.objects.link(o);o.parent=rotor;o.data.materials.append(old.data.materials[0]);o.name='Optical_frame_clearance_rail'
    bevel=o.modifiers.new('Frame machined edges','BEVEL');bevel.width=.0002;bevel.segments=2
    new.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in [old,*new]:o.select_set(True)
bpy.context.view_layer.objects.active=old;bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
bpy.ops.object.select_all(action='DESELECT')
for o in collection.objects:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['LD016_ASSEMBLY']
bpy.ops.export_scene.gltf(filepath=str(out/'LD016-engineering.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'LD016-reconstructed.blend'))
print('Open optical support frame saved, leaving back-side channel electronics clear.')
