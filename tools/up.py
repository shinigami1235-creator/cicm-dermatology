import sys; sys.path.insert(0, "/home/claude/cv4")
import cv2, numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel('/mnt/user-data/uploads/CICM/research/models/EDSR_x4.pb'); sr.setModel('edsr', 4)
sess = new_session('u2net_human_seg')
names=['jitlada','premjit','punyaphat','sunatra','pawit','sittha','phagamas','jutaporn']
for n in names:
    src = Image.open(f'/mnt/user-data/uploads/CICM/research/faculty/{n}.png').convert('RGBA')
    bg = Image.new('RGB', src.size, (255,255,255)); bg.paste(src, mask=src.split()[3])
    arr = cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2BGR)
    up = sr.upsample(arr)
    up = Image.fromarray(cv2.cvtColor(up, cv2.COLOR_BGR2RGB))
    up = up.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    cut = remove(up, session=sess, post_process_mask=True)
    cut.save(f'{n}-cut.png'); up.save(f'{n}-up.jpg', quality=92)
    print(n, up.size)
