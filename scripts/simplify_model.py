"""Run with Blender: blender --background --python scripts/simplify_model.py."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
boundary=json.loads((ROOT/'data/site_boundary.json').read_text())
def inside(x,y):
    result=False
    for (ax,ay),(bx,by) in zip(boundary,boundary[1:]+boundary[:1]):
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:result=not result
    return result
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'output/community_v1.blend'))
removed=[]
for obj in list(bpy.data.objects):
    if obj.name.startswith('Landscape / tree') and not inside(obj.location.x,-obj.location.y):
        removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
assert not any(o.name.startswith('Landscape / tree') and not inside(o.location.x,-o.location.y) for o in bpy.data.objects)
report={'removedExteriorTreeObjects':len(removed),'remainingInteriorTreeObjects':sum(o.name.startswith(('Landscape / tree','Garden / tree','Garden / clustered canopy')) for o in bpy.data.objects)}
(ROOT/'data/model_simplification.json').write_text(json.dumps(report,indent=2))
s=bpy.context.scene;s['revision']='V20-public-no-exterior-trees'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'output/community_v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'output/community_v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
cam=s.camera
if s.render.engine=='CYCLES':s.cycles.samples=24
for name,pos,target,scale,size in [('community_overview',(195,-310,260),(-48,0,0),335,(1400,1000)),('community_plan',(-60,0,360),(-60,0,0),325,(1200,1600))]:
    cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x,s.render.resolution_y=size;s.render.filepath=str(ROOT/'output'/(name+'.png'));bpy.ops.render.render(write_still=True)
print('SIMPLIFICATION_COMPLETE',report)
