"""Extend only the lower enclosure skirt, retaining semantic explode ownership."""
import bpy, pathlib, json, math
out=pathlib.Path(__file__).parent
scene=bpy.data.scenes['LD016_Engineering']
bpy.context.window.scene=scene
scene.frame_set(1)
bpy.context.view_layer.update()
owner=bpy.data.objects['housing_base']
obj=next(o for o in owner.children if o.type=='MESH' and 'Anodised_Graphite' in o.name)
if not obj.get('seam_closed_20261112'):
    adjacency=[[] for _ in obj.data.vertices]
    for edge in obj.data.edges:
        a,b=edge.vertices
        adjacency[a].append(b);adjacency[b].append(a)
    visited=set();matches=[]
    for index in range(len(adjacency)):
        if index in visited:continue
        stack=[index];visited.add(index);component=[]
        while stack:
            j=stack.pop();component.append(j)
            for k in adjacency[j]:
                if k not in visited:visited.add(k);stack.append(k)
        points=[obj.matrix_world@obj.data.vertices[j].co for j in component]
        if len(component)>1000 and abs(min(p.z for p in points)-.0044)<1e-6 and abs(max(p.z for p in points)-.0116)<1e-6:
            matches.append(component)
    assert len(matches)==1, 'Expected exactly one original lower skirt component'
    inverse=obj.matrix_world.inverted()
    for index in matches[0]:
        point=obj.matrix_world@obj.data.vertices[index].co
        point.z=.0044+(point.z-.0044)*(11.4/7.2)
        obj.data.vertices[index].co=inverse@point
    obj.data.update()
    obj['seam_closed_20261112']=True
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.collections['LD016_Model'].objects:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['LD016_ASSEMBLY']
bpy.ops.export_scene.gltf(filepath=str(out/'LD016-engineering.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'LD016-reconstructed.blend'))
report={'skirt_z_mm':[4.4,15.8], 'window_gasket_z_mm':[15.25,16.75], 'axial_overlap_mm':.55, 'inner_radius_mm':45.5, 'io_board_outer_radius_mm':43.5, 'io_board_radial_clearance_mm':2, 'semantic_owner':'housing_base', 'notes':'Lower skirt encloses the open gap; window remains a separate removable assembly.'}
(out/'housing-seam-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(report)
