"""LD-016 original functional teaching model. Run in the connected Blender via MCP.
Author dimensions are mm, converted to metres. No OEM CAD or inferred PCB schematic.
"""
import bpy, math, json, pathlib
from mathutils import Vector
from math import sin, cos, pi

OUT = pathlib.Path(__file__).parent
PREFIX = 'LD016_'
# Touch only this task's named scenes/data; preserve any user's other scene.
for c in list(bpy.data.collections):
    if c.name.startswith(PREFIX):
        for o in list(c.objects):bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.collections.remove(c)
for s in list(bpy.data.scenes):
    if s.name.startswith(PREFIX):
        bpy.data.scenes.remove(s)
scene = bpy.data.scenes.new(PREFIX+'Engineering')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'MILLIMETERS'
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 360
model = bpy.data.collections.new(PREFIX+'Model')
studio = bpy.data.collections.new(PREFIX+'Studio')
scene.collection.children.link(model); scene.collection.children.link(studio)
def move_collection(o, col=model):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)
def v(x): return Vector(x)*.001
def mat(name, color, metal=0, rough=.4, emission=0, alpha=1):
    m=bpy.data.materials.new(PREFIX+name);m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value=(*color,alpha)
    n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
    n.inputs['Alpha'].default_value=alpha
    if emission:
        n.inputs['Emission Color'].default_value=(*color,1)
        n.inputs['Emission Strength'].default_value=emission
    m.diffuse_color=(*color,alpha)
    return m
M={
 'silver':mat('BeadBlasted_Aluminium',(.46,.52,.54),.82,.29),
 'edge':mat('Machined_Aluminium',(.64,.7,.72),.9,.2),
 'black':mat('Anodised_Graphite',(.024,.038,.043),.7,.31),
 'rubber':mat('Silicone_Seal',(.009,.014,.017),0,.72),
 'window':mat('Infrared_Window',(.024,.065,.069),.16,.18),
 'pcb':mat('Soldermask_Green',(.018,.12,.085),.15,.4),
 'copper':mat('Copper_Winding',(.62,.22,.068),.78,.26),
 'gold':mat('Gold_Contact',(.76,.48,.12),.82,.24),
 'chip':mat('IC_Encapsulation',(.012,.019,.025),.1,.42),
 'ceramic':mat('Ceramic',(.7,.72,.61),0,.47),
 'lens':mat('AR_Coated_Optic',(.035,.22,.27),.68,.12),
 'tx':mat('Tx_Amber',(.95,.35,.045),.2,.22,.5),
 'rx':mat('Rx_Cyan',(.025,.58,.49),.2,.22,.4),
 'white':mat('Silkscreen',(.65,.76,.66),0,.55),
 'darkred':mat('Magnet',(.19,.042,.031),.55,.35),
 'fr4':mat('FR4_Laminate_Edge',(.12,.095,.038),0,.78),
 'trace':mat('Masked_Copper_Route',(.018,.092,.062),.08,.63),
 'solder':mat('Solder_Termination',(.45,.48,.5),.88,.3),
}
nodes={}
def empty(name,parent=None,offset=(0,0,0),part=None,desc=''):
    o=bpy.data.objects.new(name,None);model.objects.link(o);o.parent=parent
    o.empty_display_size=.003;nodes[name]=o
    o['explode_m']=list(v(offset));o['part_id']=part or name;o['description']=desc
    return o
root=empty('LD016_ASSEMBLY');root['units']='metres';root['model_status']='Original functional teaching assembly, not VLP-16 manufacturer CAD'
root['explode']=0.0;root['spin']=0.0
root.id_properties_ui('explode').update(min=0,max=1,description='0 assembled / 1 exploded')
def driven(o):
    o['home_m']=list(o.location)
    for i in range(3):
        if abs(o['explode_m'][i])<1e-10:continue
        d=o.driver_add('location',i).driver;d.expression=f'{o.location[i]} + e * {o["explode_m"][i]}'
        q=d.variables.new();q.name='e';q.type='SINGLE_PROP';q.targets[0].id=root;q.targets[0].data_path='["explode"]'
def rotation_driver(o):
    d=o.driver_add('rotation_euler',2).driver;d.expression='a * (1-e)'
    for key,path in [('a','["spin"]'),('e','["explode"]')]:
        q=d.variables.new();q.name=key;q.type='SINGLE_PROP';q.targets[0].id=root;q.targets[0].data_path=path
def finish(o,name,parent,material):
    o.name=name;move_collection(o);o.parent=parent
    if material:o.data.materials.append(M[material] if isinstance(material,str) else material)
    return o
def bevel(o,w=.2):
    m=o.modifiers.new('Machined edge radii','BEVEL');m.width=w*.001;m.segments=2
    m=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');m.keep_sharp=True
def cube(name,parent,xyz,dim,material='silver',r=.15):
    bpy.ops.mesh.primitive_cube_add(size=1,location=v(xyz));o=bpy.context.object;o.dimensions=v(dim)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,name,parent,material)
    if r:bevel(o,min(r,min(dim)*.2))
    return o
def cylinder(name,parent,xyz,r,depth,material='silver',axis=(0,0,1),verts=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r*.001,depth=depth*.001,location=v(xyz))
    o=finish(bpy.context.object,name,parent,material)
    o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector(axis))
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    bevel(o,.08 if r<2 else .18);return o
def ring(name,parent,xyz,outer,inner,height,material='silver',segments=96,arc=2*pi,start=0):
    # Actual annular solid, including inner wall and axial mating faces.
    closed=abs(arc-2*pi)<1e-6;n=segments if closed else segments+1;verts=[];faces=[]
    for z,r in [(-height/2,outer),(height/2,outer),(-height/2,inner),(height/2,inner)]:
        for i in range(n):
            a=start+arc*i/segments;verts.append(tuple(v((xyz[0]+r*cos(a),xyz[1]+r*sin(a),xyz[2]+z))))
    for i in range(segments):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    if not closed:faces.extend([(0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);model.objects.link(o);o.parent=parent;o.data.materials.append(M[material])
    for p in mesh.polygons:p.use_smooth=p.index<segments*4 and p.index%4<2
    bevel(o,.1);return o
def wire(name,parent,points,material='copper',radius=.2):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=6;c.bevel_depth=radius*.001;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,xyz in zip(s.points,points):p.co=(*v(xyz),1)
    o=bpy.data.objects.new(name,c);model.objects.link(o);o.parent=parent;c.materials.append(M[material]);return o
def screw(parent,x,y,z):
    cylinder('M2_socket_head',parent,(x,y,z),1.45,1.2,'edge',verts=12)
    cylinder('Hex_socket_recess',parent,(x,y,z+.62),.65,.025,'black',verts=6)
def pcb(name,parent,z,r,inner=0):
    body=ring(name,parent,(0,0,z),r,inner or 1.6,1.05,'fr4')
    for side in [-1,1]:ring(name+'_soldermask',parent,(0,0,z+side*.54),r-.04,(inner or 1.6)+.03,.025,'pcb')
    return body
def ic(parent,x,y,z,w,h,label):
    cube(label,parent,(x,y,z),(w,h,1.05),'chip',.12)
    for sign in [-1,1]:
        for i in range(6):cube('IC_lead',parent,(x-w*.42+i*w*.168,y+sign*(h/2+.35),z-.23),(.22,.9,.2),'edge',.025)
    cube('Chip_orientation_mark',parent,(x-w*.32,y-h*.25,z+.55),(.5,.5,.035),'white',.015)

base=empty('housing_base',root,(0,0,-15),'housing','Flanged base supports all fixed components; not rotating')
cylinder('Base_flange',base,(0,0,2.2),51.5,4.4,'silver',verts=128)
# Continuous lower skirt reaches the window gasket (15.25–16.75 mm).
# The 0.55 mm axial overlap closes the enclosure without covering internal boards.
ring('Base_annular_pocket',base,(0,0,10.1),49.5,45.5,11.4,'black')
ring('Lower_seal_groove',base,(0,0,12.2),48.2,46.6,1,'rubber')
for i in range(6):
    a=2*pi*i/6;screw(base,47.2*cos(a),47.2*sin(a),4.9)
for i in range(4):
    a=pi/4+i*pi/2;cylinder('PCB_standoff',base,(35*cos(a),35*sin(a),6.7),1.75,4.5,'gold',verts=12)
connector=cylinder('Power_Ethernet_connector',base,(-48,0,7),5,10,'black',(-1,0,0),32)
for x in [-49,-52]:cylinder('Cable_gland_ring',base,(x,0,7),5.5,1,'silver',(-1,0,0),48)
for i in range(4):cylinder('Connector_pin',base,(-54,(-1.5 if i<2 else 1.5),6+(i%2)*2),.48,1.3,'gold',(-1,0,0),12)

io=empty('io_board',root,(-112,-12,-10),'io','Stationary power conditioning and Ethernet interface; harness stays fixed')
pcb('Interface_PCB',io,9.5,43.5,12)
ic(io,-25,-11,10.6,9,7,'Ethernet_PHY');ic(io,-25,12,10.6,7,7,'Power_regulator')
for i in range(7):
    a=pi*.2+i*.33;x=31*cos(a);y=31*sin(a)
    cube('MLCC_capacitor',io,(x,y,10.4),(2.3,1.2,.7),'ceramic',.08)
    wire('Ground_return_trace',io,[(x,y,10.05),(x*.8,y,10.05),(x*.8,y*.75,10.05)],'gold',.08)
for y in [-3,0,3]:wire('Fixed_IO_harness',io,[(-42,y,9.5),(-36,y,11.3),(-32,y,11.3),(-29,y,10.8)],'rubber',.4)

coupling=empty('rotary_coupling',root,(105,13,-5),'coupling','Generic gold-ring/brush rotary coupling; illustrative implementation, not a verified VLP16 part')
coupling_rotor=empty('coupling_rotating_rings',coupling);rotation_driver(coupling_rotor)
ring('Coupling_insulator',coupling_rotor,(0,0,16),9.8,5.2,9,'rubber',64)
for i in range(6):ring('Gold_rotary_contact',coupling_rotor,(0,0,12.6+i*1.3),10,9.6,.65,'gold',64)
cube('Stationary_brush_carrier',coupling,(12,0,16),(3,7,10),'black')
for i in range(6):
    wire('Spring_contact',coupling,[(13,0,12.6+i*1.3),(11.5,0,12.6+i*1.3),(10,0,12.6+i*1.3)],'gold',.14)
    wire('Brush_to_fixed_IO',coupling,[(13,0,12.6+i*1.3),(16,0,10.7),(21,i*.55-1.5,10.7)],'rubber',.16)

motor=empty('motor_stator',root,(-108,0,51),'motor','Fixed 12-slot stator; magnetic rotor and shaft turn together')
ring('Motor_back_iron',motor,(0,0,24),19.2,12.2,7,'black')
# Fixed support joins the lower bearing seat to the stator without touching the shaft.
ring('Lower_bearing_fixed_support',motor,(0,0,24),12.3,8.1,6,'silver',64)
for a in [pi/2,7*pi/6,11*pi/6]:
    cylinder('Motor_base_mount_post',motor,(44.6*cos(a),44.6*sin(a),10.5),.65,12,'silver',verts=20)
    arm=cube('Motor_fixed_support_arm',motor,(28*cos(a),28*sin(a),17.3),(33,1.8,1.4),'silver',.2);arm.rotation_euler.z=a
    cylinder('Motor_fixed_support_riser',motor,(11*cos(a),11*sin(a),19.6),.8,4.2,'silver',verts=20)
for i in range(12):
    a=i*pi/6
    tooth=cube('Stator_tooth',motor,(15*cos(a),15*sin(a),24),(6.2,3,6),'silver',.2);tooth.rotation_euler.z=a
    # Distinct stacked copper turns around each stator tooth, not decorative loose coils.
    for j in range(5):
        rr=15.2;zz=21.6+j*1.2
        points=[]
        for dx,dy in [(-2.6,-2.15),(2.6,-2.15),(2.6,2.15),(-2.6,2.15),(-2.6,-2.15)]:
            points.append((rr*cos(a)+dx*cos(a)-dy*sin(a),rr*sin(a)+dx*sin(a)+dy*cos(a),zz))
        wire('Stator_copper_turn',motor,points,'copper',.35)
for i in range(3):wire('Three_phase_motor_lead',motor,[(19,2*i-2,24),(23,2*i-2,20),(23,2*i-2,11)],'rubber',.35)

rotor=empty('rotor_head',root,(0,0,103),'rotor','Shared rigid optical carrier; shaft, magnets, optics, timing board and encoder disc rotate in phase')
rotation_driver(rotor)
cylinder('Hollow_rotor_shaft',rotor,(0,0,37),5,44,'edge',verts=64)
# Shaft has a real lumen for rotating-only wiring.
shaft=bpy.data.objects['Hollow_rotor_shaft'];bpy.data.objects.remove(shaft,do_unlink=True)
ring('Hollow_rotor_shaft',rotor,(0,0,45),5,3.3,64,'edge',64)
ring('Rotor_magnetic_cup',rotor,(0,0,24),22,20.4,10,'silver')
for i in range(8):
    a=i*pi/4
    ring('Rotor_magnet_segment',rotor,(0,0,24),20.35,19.65,6.6,'darkred',12,pi/4*.83,a)
ring('Rotor_carrier_deck',rotor,(0,0,31),39,5,2.3,'black')
for a in [pi*.65,pi*1.35]:
    x,y=30*cos(a),30*sin(a)
    cube('Optical_bridge_pillar',rotor,(x,y,47),(4,4,30),'silver')
    screw(rotor,x,y,63)
for y in [-13,0,13]:cube('Optical_frame_vertical',rotor,(18,y,52),(7,1.2,38),'black',.25)
for z in [34.2,71.9]:cube('Optical_frame_crossbar',rotor,(18,0,z),(7,27.2,1.6),'black',.25)

bearings=empty('shaft_bearings',root,(104,-12,65),'bearings','Two spaced radial bearings; outer races fixed, inner races turn with shaft')
for z in [28.3,72.8]:
    ring('Bearing_fixed_race',bearings,(0,0,z),8,6.6,3,'edge',64)
    inner=empty('Bearing_inner_'+str(z).replace('.',''),bearings);rotation_driver(inner)
    ring('Bearing_inner_race',inner,(0,0,z),5.6,5,3,'silver',64)
    for i in range(10):
        a=i*2*pi/10
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.00068,location=v((6.1*cos(a),6.1*sin(a),z)))
        o=finish(bpy.context.object,'Bearing_ball',inner,'edge')

encoder=empty('angle_encoder',root,(-105,3,126),'encoder','Reflective code ring beneath the carrier and a stationary optical pickup provide azimuth reference')
disc=empty('encoder_rotating_disc',encoder);rotation_driver(disc)
ring('Encoder_code_carrier',disc,(0,0,29.25),31,26,.45,'black',96)
for a in [0,pi/2,pi,pi*1.5]:
    cylinder('Encoder_deck_standoff',disc,(28*cos(a),28*sin(a),29.7),.7,.3,'silver',verts=16)
for i in range(48):
    a=i*2*pi/48
    ring('Encoder_alternating_track',disc,(0,0,29),30.5,26.5,.05,'gold',2,pi/48,a)
cube('Fixed_encoder_sensor',encoder,(28.5,0,27),(3.5,3.6,2.5),'chip')
cube('Encoder_fixed_bracket',encoder,(33,0,16),(3.2,4,22),'silver')
cube('Encoder_sensor_arm',encoder,(30.7,0,25.4),(7.5,4,.8),'silver')

timing=empty('timing_board',rotor,(-79,0,43),'timing','Rotating pulse driver, receive front-end and time-of-flight processing board')
pcb('Rotating_timing_PCB',timing,34,35,6)
ic(timing,-19,0,35.1,10,10,'ToF_processing');ic(timing,-3,-20,35.1,8,6,'Laser_pulse_driver');ic(timing,-3,20,35.1,8,6,'Receive_front_end')
for i in range(4):screw(timing,23*cos(pi/4+i*pi/2),23*sin(pi/4+i*pi/2),35)
for i in range(4):
    z=12.6+i*1.3
    wire('Rotating_shaft_harness',rotor,[(9.7,0,z),(1+i*.55,0,z),(1+i*.55,0,36.5),(5+i*.55,-10,36.5),(5+i*.55,-10,35.6)],'rubber',.18)

tx=empty('tx_optical_array',rotor,(70,-45,23),'emitter','16 individual pulse-source/collimator channels, elevations -15 to +15 degrees')
rx=empty('rx_optical_array',rotor,(70,45,23),'receiver','16 corresponding receive lenses, optical filters and detector channels')
angles=[-15+2*i for i in range(16)]
channels=[]
for parent,y,role in [(tx,-9,'tx'),(rx,9,'rx')]:
    cube(role+'_vertical_substrate',parent,(21,y,53),(1.2,5,36),'pcb',.13)
    for i,elev in enumerate(angles):
        # Reverse physical order keeps every optical path within the side window.
        # Separate beam axes may cross; the rigid barrels themselves have clearance.
        z=37+(15-i)*2.2;a=math.radians(elev);d=Vector((cos(a),0,sin(a)))
        back=Vector((22,y,z));front=back+d*12
        cylinder(role+'_channel_%02d_barrel'%i,parent,back+d*7,.92 if role=='rx' else .82,10,'black',d,24)
        cylinder(role+'_channel_%02d_retaining_ring'%i,parent,back+d*11.65,1 if role=='rx' else .9,.7,'edge',d,24)
        cylinder(role+'_channel_%02d_lens'%i,parent,front,.76 if role=='rx' else .6,.55,'lens',d,24)
        cylinder(role+'_channel_%02d_source'%i,parent,back+d*.7,.7,1,role,d,16)
        cube(role+'_channel_filter_%02d'%i,parent,back+d*2.5,(.3,1.3,1.3),'lens',.03)
        for yy in [-1.6,1.6]:wire(role+'_electrical_lead',parent,[(21,y+yy,z),(22,y+yy,z),(22,y,z)],'gold',.09)
        if role=='tx':channels.append({'id':i,'elevation_deg':elev,'origin_m':list(front*.001),'direction':list(d)})
        else:channels[i]['receive_origin_m']=list(front*.001)
    for z in [35.2,71]:screw(parent,18,y,z)
    wire(role+'_rotor_ribbon',parent,[(21,y,36),(17,y,36.5),(13,y,35.6)],'rubber',.45)

window=empty('ir_window',root,(190,0,118),'window','Stationary annular infrared window; removable for teaching, does not spin')
ring('IR_window_real_wall',window,(0,0,47),49.4,48.2,62,'window',128)
for z in [16,78]:ring('Window_edge_seal',window,(0,0,z),49.7,47.7,1.5,'rubber',128)
lid=empty('top_lid',root,(0,0,220),'lid','Fixed top cover, bearing support and sealing lip')
cylinder('Lid_top',lid,(0,0,81),50.6,3.8,'silver',verts=128)
ring('Lid_machined_lip',lid,(0,0,78.8),49.5,46.9,1.4,'edge',128)
for a in [pi*.65,pi*1.35]:
    x,y=30*cos(a),30*sin(a)
    screw(lid,x,y,83.5)
ring('Top_bearing_support',lid,(0,0,75),10,8.1,6.5,'silver',64)
for i in range(3):
    a=i*2*pi/3
    beam=cube('Fixed_lid_support_spoke',lid,(23*cos(a),23*sin(a),77),(29,3,3),'silver',.25);beam.rotation_euler.z=a

# Additional functional PCB packages are authored before semantic material joining.
exec(compile((OUT/'board_detail.py').read_text(encoding='utf-8'),'board_detail.py','exec'))

for o in list(nodes.values()):
    if o!=root:driven(o)

# Asset exported in assembled rest pose. Fine meshes are joined by material within
# each semantic owner, keeping selection/animation identities and reducing draw calls.
for owner in list(nodes.values()):
    groups={}
    for o in list(owner.children):
        if o.type in {'MESH','CURVE','FONT'}:groups.setdefault(o.data.materials[0].name if len(o.data.materials) else '',[]).append(o)
    for material,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.convert(target='MESH')
        if len(objects)>1:bpy.ops.object.join()
        joined=bpy.context.object
        joined.name=owner.name+'__'+material.removeprefix(PREFIX);joined['part_id']=owner.get('part_id',owner.name)

root['explode']=0;root['spin']=0;scene.frame_set(1);bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'LD016-engineering.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_apply=True)

manifest={'model':'LD-016 original teaching assembly','units':'metres','outer_dimensions_m':[.113,.103,.0847],
 'rotating_nodes':['rotor_head','coupling_rotating_rings','encoder_rotating_disc','Bearing_inner_283','Bearing_inner_728'],
 'channels':channels,'parts':[{ 'name':o.name,'id':o.get('part_id'),'description':o.get('description'),'explode_m':list(o['explode_m']),'parent':o.parent.name if o.parent else None} for o in nodes.values()],
 'limitations':['Not an OEM VLP-16 teardown','16 discrete lens assemblies and circuit layout are an original teaching design','Rotary electrical interface uses an illustrative brush/ring solution','No laser safety, optical efficiency, electronics or motor electromagnetic simulation','Actual laser propagation is invisible and nanosecond scale; visible paths are slowed teaching graphics']}
(OUT/'model-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

for frame,e,angle in [(1,0,0),(121,0,4*pi),(181,1,4*pi),(271,1,4*pi),(331,0,4*pi),(360,0,5*pi)]:
    root['explode']=e;root['spin']=angle
    root.keyframe_insert(data_path='["explode"]',frame=frame);root.keyframe_insert(data_path='["spin"]',frame=frame)
for frame,label in [(1,'ASSEMBLED / slowed rotation'),(121,'DISASSEMBLE'),(181,'EXPLODED / inspect systems'),(271,'REASSEMBLE')]:scene.timeline_markers.new(label,frame=frame)

# Studio: intentional neutral product light, with an explanatory close camera.
def studio_obj(o):move_collection(o,studio);return o
world=bpy.data.worlds.new(PREFIX+'World');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.075,.1,.105,1);bg.inputs[1].default_value=.45
def light(name,pos,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size*.001;data.color=color
    o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=v(pos);o.rotation_euler=(v((0,0,50))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key_softbox',(130,-170,230),9,170,(1,.89,.73));light('Edge_softbox',(-140,80,180),12,140,(.59,.86,1));light('Front_fill',(80,180,80),6,130,(.8,1,.93))
floor_mat=mat('Studio_floor',(.027,.046,.05),.22,.5)
bpy.ops.mesh.primitive_plane_add(size=2000*.001,location=v((0,0,-20)));floor=studio_obj(bpy.context.object);floor.name=PREFIX+'Studio_Floor';floor.data.materials.append(floor_mat)
bpy.ops.object.camera_add(location=v((175,-235,153)));cam=studio_obj(bpy.context.object);cam.name=PREFIX+'Camera';scene.camera=cam;cam.data.lens=55;cam.data.clip_start=.001;cam.data.clip_end=20
def camera_pose(xyz,target):cam.location=v(xyz);cam.rotation_euler=(v(target)-cam.location).to_track_quat('-Z','Y').to_euler()
camera_pose((175,-235,153),(0,0,37))
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
try:scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
except TypeError:pass
scene.view_settings.view_transform='AgX'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'LD016-reconstructed.blend'))
print(json.dumps({'status':'built','scene':scene.name,'objects':len(model.objects),'meshes':sum(o.type=='MESH' for o in model.objects),'polygons':sum(len(o.data.polygons) for o in model.objects if o.type=='MESH'),'glb_bytes':(OUT/'LD016-engineering.glb').stat().st_size,'channels':len(channels)},ensure_ascii=False))
