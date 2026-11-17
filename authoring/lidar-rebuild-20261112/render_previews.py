"""Bounded Blender product renders; run only against this task's saved .blend."""
import bpy, pathlib, math, json
from mathutils import Vector
out=pathlib.Path(__file__).parent
s=bpy.data.scenes['LD016_Engineering'];bpy.context.window.scene=s
root=bpy.data.objects['LD016_ASSEMBLY'];cam=s.camera
s.render.resolution_x=1500;s.render.resolution_y=1200;s.cycles.samples=24
s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG'
def aim(position,target):
    cam.location=Vector(position);cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def render(name):
    s.render.filepath=str(out/name);bpy.ops.render.render(write_still=True)
s.frame_set(1);aim((.17,-.23,.15),(0,0,.04));render('blender-assembled.png')
for name in ['ir_window','top_lid']:
    for o in [bpy.data.objects[name],*bpy.data.objects[name].children_recursive]:o.hide_render=True
aim((.155,-.125,.115),(0,0,.04));render('blender-internal.png')
for name in ['ir_window','top_lid']:
    for o in [bpy.data.objects[name],*bpy.data.objects[name].children_recursive]:o.hide_render=False
s.frame_set(181);aim((.42,-.64,.38),(.04,0,.145));cam.data.lens=51;render('blender-exploded.png')
print('LD016 preview renders complete')
