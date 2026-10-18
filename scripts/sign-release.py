"""Sign a verified release APK locally; credentials stay out of argv and source control."""
import argparse,hashlib,os,subprocess,zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--apksigner',required=True);p.add_argument('--keystore',required=True);p.add_argument('--password-file',required=True);p.add_argument('--output',required=True);a=p.parse_args()
env=dict(os.environ,HORAR_RELEASE_PASSWORD=Path(a.password_file).read_text().strip())
subprocess.run(['java','-jar',a.apksigner,'sign','--ks',a.keystore,'--ks-key-alias','horar-release','--ks-pass','env:HORAR_RELEASE_PASSWORD','--key-pass','env:HORAR_RELEASE_PASSWORD','--out',a.output,a.input],env=env,check=True)
result=subprocess.check_output(['java','-jar',a.apksigner,'verify','--verbose','--print-certs',a.output],text=True)
if 'CN=Horar Release' not in result or 'CN=Android Debug' in result:raise RuntimeError('Wrong certificate')
with zipfile.ZipFile(a.input) as before,zipfile.ZipFile(a.output) as after:
 for name in before.namelist():
  if name.startswith('META-INF/'):continue
  if before.read(name)!=after.read(name):raise RuntimeError('APK content changed: '+name)
out=Path(a.output);out.with_suffix('.certificate.txt').write_text(result);out.with_suffix('.sha256').write_text(hashlib.sha256(out.read_bytes()).hexdigest()+'  '+out.name+'\n')
print(result);print('Verified: every original APK entry unchanged; release certificate applied.')
