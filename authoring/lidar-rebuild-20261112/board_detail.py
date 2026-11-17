"""Original teaching PCB layout. Packages are functional blocks, not an OEM schematic."""
import random
package_counts={};_mesh_cache={};footprints={};regions={}
def fastbox(name,parent,xyz,dim,material):
    key=tuple(dim)+(material,)
    if key not in _mesh_cache:
        verts=[(sx*dim[0]*.0005,sy*dim[1]*.0005,sz*dim[2]*.0005) for sx,sy,sz in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        me=bpy.data.meshes.new(name+'_shared');me.from_pydata(verts,[],[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]);me.materials.append(M[material]);me.update();_mesh_cache[key]=me
    # Material joining mutates the active mesh. Each package needs its own small
    # mesh copy so joining one board cannot modify another linked package.
    o=bpy.data.objects.new(name,_mesh_cache[key].copy());model.objects.link(o);o.parent=parent;o.location=v(xyz);return o
def reserve(parent,x,y,w,h):footprints.setdefault(parent.name,[]).append((x,y,w,h))
def valid(parent,x,y,w,h,outer,inner):
    corners=[(x+sx*w/2,y+sy*h/2) for sx in [-1,1] for sy in [-1,1]]
    if any(math.hypot(a,b)>outer-.8 for a,b in corners):return False
    if math.hypot(max(abs(x)-w/2,0),max(abs(y)-h/2,0))<inner+.7:return False
    return not any(abs(x-a)<(w+c)/2+.35 and abs(y-b)<(h+d)/2+.35 for a,b,c,d in footprints.get(parent.name,[]))
def count(parent,kind):
    key=parent.name;package_counts.setdefault(key,{});package_counts[key][kind]=package_counts[key].get(kind,0)+1
def silk(parent,text,x,y,z,size=1):
    data=bpy.data.curves.new('Silkscreen_'+text,'FONT');data.body=text;data.size=size*.001;data.extrude=0;data.resolution_u=2
    o=bpy.data.objects.new('Silk_'+text,data);model.objects.link(o);o.parent=parent;o.location=v((x,y,z));data.materials.append(M['white']);return o
def chipqfp(parent,name,x,y,z,w,h,pins=5):
    cube(name,parent,(x,y,z+.52),(w,h,.94),'chip',.09)
    for sign in [-1,1]:
        for i in range(pins):
            a=(i-(pins-1)/2)*w/(pins+1)
            fastbox(name+'_gullwing',parent,(x+a,y+sign*(h*.5+.31),z+.14),(.2,.7,.18),'solder')
            fastbox(name+'_pad',parent,(x+a,y+sign*(h*.5+.42),z+.035),(.28,1,.05),'gold')
    fastbox(name+'_pin1',parent,(x-w*.32,y-h*.29,z+1),(.3,.3,.02),'white')
    reserve(parent,x,y,w+.4,h+1.7);count(parent,name)
def passive(parent,name,x,y,z,kind='C'):
    fastbox(name,parent,(x,y,z+.24),(1.03,.54,.43),'ceramic' if kind=='C' else 'chip')
    for sign in [-1,1]:
        fastbox(name+'_termination',parent,(x+sign*.49,y,z+.25),(.2,.57,.46),'solder')
        fastbox(name+'_pad',parent,(x+sign*.64,y,z+.04),(.4,.72,.07),'gold')
    reserve(parent,x,y,1.55,.72);count(parent,'MLCC' if kind=='C' else 'resistor')
def connector(parent,name,x,y,z,pins):
    w=pins*.65+1.1;cube(name,parent,(x,y,z+.72),(w,2.7,1.35),'rubber',.13)
    fastbox(name+'_locking_bar',parent,(x,y+.65,z+1.42),(w-.4,.7,.3),'ceramic')
    for i in range(pins):
        xx=x+(i-(pins-1)/2)*.65
        fastbox(name+'_contact',parent,(xx,y-1.25,z+.45),(.24,.9,.18),'gold')
        fastbox(name+'_solder',parent,(xx,y-1.65,z+.06),(.34,.65,.1),'solder')
    reserve(parent,x,y,w+.5,4.3);count(parent,'FFC connector')
def via(parent,x,y,z):
    # Dark centre plus exposed annular pad: clear plated-hole identity at close range.
    cylinder('Via_pad',parent,(x,y,z+.014),.19,.025,'gold',verts=12)
    cylinder('Via_drill',parent,(x,y,z+.031),.09,.012,'rubber',verts=10)
def masked_route(parent,points):wire('Masked_PCB_trace',parent,points,'trace',.045)

# Keep the mechanical mounts, screw heads and existing ICs clear.
for x,y,w,h in [(-19,0,11,12),(-3,-20,9,8),(-3,20,9,8),(18,0,12,31),(-13.6,26.7,6,6),(-13.6,-26.7,6,6)]:reserve(timing,x,y,w,h)
for i in range(4):reserve(timing,23*cos(pi/4+i*pi/2),23*sin(pi/4+i*pi/2),4,4)
for x,y,w,h in [(-25,-11,10,10),(-25,12,8,10),(17,0,16,12),(-40,0,9,10)]:reserve(io,x,y,w,h)
for i in range(4):reserve(io,35*cos(pi/4+i*pi/2),35*sin(pi/4+i*pi/2),4,4)
for i in range(7):
    a=pi*.2+i*.33;reserve(io,31*cos(a),31*sin(a),3,2)

# A local reference clock, time-interval banks and pulse/receive processing zones.
cube('Reference_oscillator_can',timing,(-29,0,35.16),(4,3,1.14),'edge',.22);reserve(timing,-29,0,5,4);count(timing,'reference oscillator')
for name,x,y,w,h in [('Time_interval_bank_A',-22,10,4,4),('Time_interval_bank_B',-22,-10,4,4),('Low_noise_regulator',-22,-20,4,3),('Receive_comparator',8,22,4,4),('Laser_gate_driver',8,-22,4,4)]:chipqfp(timing,name,x,y,34.58,w,h,5)
cube('Shielded_power_inductor',timing,(-21,-25,35.4),(3,3,1.6),'black',.3);reserve(timing,-21,-25,3.8,3.8);count(timing,'shielded inductor')
silk(timing,'4R7',-22.2,-25.5,36.22,.75)
connector(timing,'TX_FFC',17,-22,34.58,8);connector(timing,'RX_FFC',17,22,34.58,8)
silk(timing,'LD016  /  TIMING',-28,-6.6,34.57,1.15)
silk(timing,'TX',9,-29,34.57,1.35);silk(timing,'RX',9,27,34.57,1.35)
silk(timing,'REF',-31,3.2,34.57,.8);silk(timing,'POWER',-28,-16,34.57,.85)
for i,(a,b) in enumerate([((-15,0),(-22,10)),((-15,-1),(-22,-10)),((-3,-16),(8,-22)),((-3,16),(8,22)),((-29,0),(-19,0))]):
    for j in range(3):
        yy=j*.24;masked_route(timing,[(a[0],a[1]+yy,34.572),((a[0]+b[0])/2,a[1]+yy,34.572),((a[0]+b[0])/2,b[1]+yy,34.572),(b[0],b[1]+yy,34.572)])

# Fixed interface board: input protection, regulators, clock, PHY support and links.
for name,x,y,w,h in [('IO_link_controller',24,-16,6,5),('Power_supervisor',-10,25,4,4),('Ethernet_isolation_interface',-29,-23,5,4),('Regulator_switch',9,-25,4,4)]:chipqfp(io,name,x,y,10.08,w,h,5)
for x,y in [(-18,24),(15,-26)]:
    cube('IO_power_inductor',io,(x,y,10.9),(4,4,1.55),'black',.3);reserve(io,x,y,5,5);count(io,'shielded inductor')
connector(io,'External_power_header',28,19,10.08,8);connector(io,'Internal_data_header',18,30,10.08,10)
cube('IO_clock_can',io,(-12,-22,10.8),(4,2.8,1.2),'edge',.2);reserve(io,-12,-22,5,4);count(io,'reference oscillator')
silk(io,'LD016 / POWER + LINK',-32,0,10.072,1.1);silk(io,'VIN',22,24,10.072,1.3);silk(io,'DATA',14,34,10.072,1.2)
regions['timing_board']=['reference clock','time interval conversion','transmit pulse driver','receive comparator','local regulation','FFC links']
regions['io_board']=['power protection / regulation','clock','data link','Ethernet PHY support','rotary interface']

# Populate coherent support networks in reserved free areas; exact, deterministic footprints.
rng=random.Random(1606)
for parent,z,outer,inner,spacing in [(timing,34.58,35,6,2.25),(io,10.08,43.5,12,2.65)]:
    step=spacing;row=0
    for yi in range(-16,17):
        y=yi*step;row+=1
        for xi in range(-16,17):
            x=xi*step+(step*.5 if row%2 else 0)
            if rng.random()>.63 or not valid(parent,x,y,1.65,.9,outer,inner):continue
            kind='C' if (xi+yi)%3 else 'R';passive(parent,f'{parent.name}_{kind}_{xi}_{yi}',x,y,z,kind)
            # Most copper is below soldermask; only short end pads are exposed.
            masked_route(parent,[(x-.65,y,z-.007),(x-1.0,y,z-.007),(x-1.0,y+.7,z-.007)])
            if (xi+yi)%5==0:via(parent,x-1.05,y+.75,z-.007)
            if (xi+yi)%13==0:silk(parent,f'{kind}{abs(xi*17+yi)}',x-.6,y+.6,z-.008,.47)

# Place tiny transimpedance/gate packages at the optical arrays, close to each channel.
for parent,role,y in [(tx,'gate',-9),(rx,'TIA',9)]:
    for i in range(16):
        z=37+(15-i)*2.2
        fastbox(f'{role}_channel_{i}',parent,(19.94,y,z),(.65,2.45,1.25),'chip')
        for dy in [-1,1]:
            for dz in [-.4,.4]:fastbox(f'{role}_channel_pin',parent,(20.27,y+dy*1.22,z+dz),(.37,.4,.18),'solder')
        fastbox(f'{role}_decoupling_cap',parent,(20.02,y+1.85,z),(.6,.65,.55),'ceramic')
        count(parent,'local TIA' if role=='TIA' else 'local gate stage')
    # Silkscreen channel markers on the vertical substrate's back face.
    for i in [0,4,8,12]:
        o=silk(parent,str(i).zfill(2),19.56,y-1,37+(15-i)*2.2,.65);o.rotation_euler.y=-pi/2

root['component_packages']=sum(sum(x.values()) for x in package_counts.values())
(OUT/'board-detail-manifest.json').write_text(json.dumps({'status':'original functional teaching layout, not a production netlist','packages':package_counts,'functional_regions':regions,'total_discrete_packages':root['component_packages'],'footprint_keepouts_mm':footprints},ensure_ascii=False,indent=2),encoding='utf-8')
print('Detailed PCB discrete packages:',root['component_packages'])
