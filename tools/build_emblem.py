"""Build the 3D CICM emblem from the traced SVG paths.
Run: python3 build_emblem.py  (Blender as the bpy module)
Outputs: emblem/cicm-emblem.glb, emblem/cicm-emblem.blend, emblem/preview_*.png
"""
import bpy, json, os, math, addon_utils
from mathutils import Vector

addon_utils.enable('io_curve_svg')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'emblem'); os.makedirs(OUT, exist_ok=True)

P = {}
for c in ['grey', 'red', 'yellow', 'orange']:
    P.update(json.load(open(os.path.join(HERE, 'trace', f'paths_{c}.json'))))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# layer order front to back: orange arrow, yellow arc, red arc, tower
PARTS = {
    'Tower':  dict(key='grey',   z=0.00, depth=0.030, bevel=0.007),
    'Red':    dict(key='red',    z=0.035, depth=0.032, bevel=0.016),
    'Yellow': dict(key='yellow', z=0.060, depth=0.034, bevel=0.017),
    'Arrow':  dict(key='orange', z=0.090, depth=0.036, bevel=0.018),
}

def mat(name, base, metallic, rough, coat=0.0, coat_rough=0.05, aniso=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = coat_rough
    if aniso and 'Anisotropic' in b.inputs:
        b.inputs['Anisotropic'].default_value = aniso
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

MATS = {
    'Tower':  mat('Brushed silver', srgb('#C9CCD1'), 1.0, 0.32, aniso=0.6),
    'Red':    mat('Enamel red',     srgb('#E3161F'), 0.0, 0.22, coat=1.0),
    'Yellow': mat('Enamel yellow',  srgb('#F6D20A'), 0.0, 0.22, coat=1.0),
    'Arrow':  mat('Enamel orange',  srgb('#F2701A'), 0.0, 0.22, coat=1.0),
}

objs = []
for name, cfg in PARTS.items():
    svg = os.path.join(OUT, f'part_{name}.svg')
    open(svg, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="329" height="302" viewBox="0 0 329 302"><path fill="#000" fill-rule="evenodd" d="{P[cfg["key"]]}"/></svg>')
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=svg)
    new = [o for o in bpy.data.objects if o not in before]
    bpy.ops.object.select_all(action='DESELECT')
    for o in new: o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    cu = o.data
    cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.resolution_u = 5
    objs.append((o, cfg))

# normalise: SVG import is in metres at 1px = ~0.000282 m; rescale so emblem ~2 units tall
bpy.ops.object.select_all(action='DESELECT')
for o, _ in objs: o.select_set(True)
bpy.context.view_layer.objects.active = objs[0][0]
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY')
xs, ys = [], []
for o, _ in objs:
    for v in o.bound_box:
        w = o.matrix_world @ Vector(v); xs.append(w.x); ys.append(w.y)
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
s = 2.0 / (max(ys) - min(ys))

for o, cfg in objs:
    o.location = ((o.location.x - cx) * s, (o.location.y - cy) * s, 0)
    o.scale = (o.scale.x * s, o.scale.y * s, 1)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    cu = o.data
    for sp in cu.splines:
        for p in sp.bezier_points: p.radius = 1.0
        for p in sp.points: p.radius = 1.0
    cu.extrude = cfg['depth']
    cu.bevel_depth = cfg['bevel']
    cu.bevel_resolution = 2
    o.location.z = cfg['z']

# convert to mesh, smooth by angle, materials
final = []
for o, cfg in objs:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0004)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception:
        bpy.ops.object.shade_smooth()
    o.data.materials.clear(); o.data.materials.append(MATS[o.name])
    final.append(o)

# group under one empty so Three.js gets one node to rotate
root = bpy.data.objects.new('CICM_Emblem', None)
scene.collection.objects.link(root)
for o in final: o.parent = root

# preview render: studio lighting
world = bpy.data.worlds.new('Studio'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.05, 0.045, 0.04, 1); bg.inputs[1].default_value = 0.25
def light(name, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
    ob = bpy.data.objects.new(name, l); scene.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
light('Key', (2.5, -1.5, 4.0), 450, 3)
light('Rim', (-3, 2.5, 1.5), 300, 2, (1, 0.9, 0.8))
light('Fill', (0, -3, 2.5), 120, 4, (0.85, 0.9, 1))
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); scene.collection.objects.link(cam)
cam.data.lens = 70; scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'CYCLES'
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 48; scene.cycles.device = 'CPU'
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x = 900; scene.render.resolution_y = 900
scene.render.film_transparent = False
for i, (yaw, pitch) in enumerate([(0, 0), (28, 10), (-35, -8)]):
    root.rotation_euler = (math.radians(pitch), math.radians(yaw), 0)
    cam.location = (0, -6.2, 0.0); cam.rotation_euler = (math.radians(90), 0, 0)
    root.rotation_euler = (math.radians(90 + pitch), 0, math.radians(yaw))
    scene.render.filepath = os.path.join(OUT, f'preview_{i}.png')
    bpy.ops.render.render(write_still=True)
root.rotation_euler = (0, 0, 0)

# export: glTF is Y-up, Blender exporter converts Z-up automatically
for ob in list(scene.objects):
    if ob.type in ('LIGHT', 'CAMERA'): ob.hide_render = True
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for o in final: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'cicm-emblem.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_lights=False, export_cameras=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'cicm-emblem.blend'))
print('tris', sum(len(o.data.polygons) for o in final))
