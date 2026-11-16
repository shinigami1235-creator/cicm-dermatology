<?php
require __DIR__.'/stubs.php';
$p=__DIR__.'/../cicm-dermatology-content/includes/';
require $p.'schema.php'; require $p.'sanitize.php'; require $p.'store.php'; require $p.'research.php';
// fields the cleaner adds with an empty default (false, 0, "", empty lists) when the original row lacks them
function nodefaults($clean,$orig){ if(!is_array($clean)) return $clean; $o=[]; foreach($clean as $k=>$v){ if(is_array($orig)&&!array_key_exists($k,$orig)&&!is_int($k)){ $flat=json_encode($v); if(in_array($flat,['false','0','""','[]','{"id":"","docs":0,"cites":0,"h":0}'],true)) continue; } $o[$k]=nodefaults($v,is_array($orig)?($orig[$k]??null):null);} return $o; }
function ksortr($v){ if(is_array($v)){ if(array_keys($v)!==range(0,count($v)-1)) ksort($v); foreach($v as $k=>$x) $v[$k]=ksortr($x);} return $v; }
$fails=0; function check($ok,$msg){ global $fails; echo ($ok?'PASS ':'FAIL ').$msg."\n"; if(!$ok)$fails++; }

// 1. the current site content survives cleaning unchanged
$orig=json_decode(file_get_contents(__DIR__.'/../../data/content.json'),true);
[$clean,$err]=cicm_clean_content($orig);
check(!$err, 'current content.json has no errors '.json_encode($err));
foreach(array_keys(cicm_schema()) as $k){
  $a=json_encode(ksortr($orig[$k]??null), JSON_UNESCAPED_UNICODE); $b=json_encode(ksortr(nodefaults($clean[$k],$orig[$k]??null)), JSON_UNESCAPED_UNICODE);
  if($a!==$b){ // show first difference
    $i=0; while($i<strlen($a)&&$i<strlen($b)&&$a[$i]===$b[$i])$i++;
    check(false, "$k round-trips: ...".substr($a,max(0,$i-60),120)."\n   vs ...".substr($b,max(0,$i-60),120));
  } else check(true,"$k round-trips");
}

// 2. hostile input is cleaned
$bad=$orig;
$bad['announcements'][0]['link']='javascript:alert(1)';
$bad['announcements'][0]['title']['en']='<script>alert(1)</script>Hello';
$bad['faculty'][0]['photo']='//evil.example/x.png';
$bad['faculty'][0]['title']='King';
$bad['visiting'][0]['group']='nowhere';
$bad['downloads'][0]['url']='data:text/html,<b>x</b>';
$bad['facebookPosts'][]='javascript:void(0)';
[$c2,$e2]=cicm_clean_content($bad);
check($c2['announcements'][0]['link']==='', 'javascript: link removed');
check($c2['announcements'][0]['title']['en']==='alert(1)Hello', 'tags stripped from titles: '.$c2['announcements'][0]['title']['en']);
check($c2['faculty'][0]['photo']==='', 'protocol-relative photo removed');
check($c2['faculty'][0]['title']==='', 'unknown academic rank refused');
check($c2['visiting'][0]['group']===$orig['visitingGroups'][0]['id'], 'unknown hospital group falls back to the first group');
check($c2['downloads'][0]['url']==='', 'data: download removed');
check(!in_array('javascript:void(0)',$c2['facebookPosts'],true), 'javascript: facebook post removed');

// 3. duplicate IDs and bad JSON are refused
$dup=$orig; $dup['faculty'][1]['id']=$dup['faculty'][0]['id'];
[, $e3]=cicm_clean_content($dup); check(count($e3)===1 && str_contains($e3[0],'used twice'), 'duplicate lecturer ID refused');
$bj=$orig; $bj['curriculum']='{not json';
[, $e4]=cicm_clean_content($bj); check(count($e4)===1 && str_contains($e4[0],'not valid'), 'invalid curriculum JSON refused');

// 4. form-style posts: "fee.thai" as a flat key, lines as text, blank rows dropped
$form=$orig; $form['programs'][0]=['id'=>'clinical','code'=>'M.Sc.','name'=>['en'=>'Clinical Dermatology','th'=>'x'],'degree'=>['en'=>'d','th'=>''],'focus'=>['en'=>'f','th'=>''],'length'=>['en'=>'2 years','th'=>''],'fee.thai'=>'170,000','fee.foreign'=>'190000'];
$form['faculty'][0]['education']="M.D., Chulalongkorn University\n\n  M.Sc. in Dermatology  \n";
$form['announcements'][]=['date'=>'','tag'=>['en'=>'','th'=>''],'title'=>['en'=>'','th'=>''],'link'=>'','pinned'=>''];
[$c5,$e5]=cicm_clean_content($form);
check($c5['programs'][0]['fee']===['thai'=>170000,'foreign'=>190000], 'fee.thai / fee.foreign nest and parse: '.json_encode($c5['programs'][0]['fee']));
check($c5['faculty'][0]['education']===['M.D., Chulalongkorn University','M.Sc. in Dermatology'], 'lines split and trimmed');
check(count($c5['announcements'])===count($orig['announcements']), 'blank new row dropped');

// 5. writing the site file: only into a folder that holds the site, atomically
$site=sys_get_temp_dir().'/cicmsite'; @mkdir("$site/data",0777,true); @mkdir("$site/js",0777,true);
update_option('cicm_site_dir','/tmp');
check(is_wp_error(cicm_write_site_file($clean)), 'refuses a folder without the site');
file_put_contents("$site/index.html",'x'); file_put_contents("$site/js/site.js",'x');
update_option('cicm_site_dir',$site);
$r=cicm_save_content($clean); check($r===true, 'saves into the site folder');
$w=json_decode(file_get_contents("$site/data/content.json"),true);
check(ksortr(nodefaults($w['faculty'],$orig['faculty']))===ksortr($orig['faculty']) && $w['updated']==='2026-11-11', 'written file matches and carries the date');
check(!glob("$site/data/*.tmp-*"), 'no temporary file left behind');
cicm_save_content($clean); check(count(get_option(CICM_OPT_REVS))===1, 'previous version kept for rollback');

// 6. research sources: Scopus parsing, OpenAlex refresh, keys never in content.json
$m=cicm_scopus_metrics(['author-retrieval-response'=>[['coredata'=>['document-count'=>'44','citation-count'=>'1790','cited-by-count'=>'1500'],'h-index'=>'16']]]);
check($m===['docs'=>44,'cites'=>1790,'h'=>16], 'Scopus Author Retrieval numbers read: '.json_encode($m));
check(cicm_scopus_metrics(['service-error'=>['status'=>['statusCode'=>'AUTHORIZATION_ERROR']]])===null, 'a Scopus error response is not read as numbers');
check(cicm_openalex_id_ok('W2409710963','W') && !cicm_openalex_id_ok('W1|W2','W') && !cicm_openalex_id_ok('A5048378082','W'), 'OpenAlex IDs checked before they go into a URL');
copy(__DIR__.'/../../data/publications.json', "$site/data/publications.json");
$GLOBALS['remote']=[['api.openalex.org/works','200',json_encode(['results'=>[['id'=>'https://openalex.org/W2409710963','cited_by_count'=>1200]]])]];
$GLOBALS['remote'][0][1]=200;
$r=cicm_refresh_openalex(); $pj=json_decode(file_get_contents("$site/data/publications.json"),true);
$mmp=array_values(array_filter($pj['papers'],fn($p)=>($p['oa']??'')==='W2409710963'))[0];
check(!is_wp_error($r) && $mmp['cites']===1200 && $pj['citesUpdated']==='2026-11-11', 'OpenAlex refresh writes the new count and date');
check(count($pj['papers'])===count(json_decode(file_get_contents(__DIR__.'/../../data/publications.json'),true)['papers']), 'refresh keeps every paper');
$GLOBALS['remote']=[]; $before=file_get_contents("$site/data/publications.json");
check(is_wp_error(cicm_refresh_openalex()) && file_get_contents("$site/data/publications.json")===$before, 'OpenAlex down: file left as it was');
update_option(CICM_OPT, cicm_json($clean));
update_option('cicm_scopus_key','abc123'); update_option('cicm_scopus_token','tok456');
$GLOBALS['remote']=[['api.elsevier.com/content/author/author_id/','200',json_encode(['author-retrieval-response'=>[['coredata'=>['document-count'=>'50','citation-count'=>'2000'],'h-index'=>'17']]])]];
$GLOBALS['remote'][0][1]=200; $GLOBALS['remote_calls']=[];
$r=cicm_refresh_scopus(); $cj=json_decode(file_get_contents("$site/data/content.json"),true);
check(!is_wp_error($r) && $cj['faculty'][0]['scopus']['docs']===50 && $cj['faculty'][0]['scopus']['h']===17 && $cj['scopusUpdated']==='2026-11-11', 'Scopus refresh saves the numbers and date');
check($GLOBALS['remote_calls'][0][1]['headers']['X-ELS-Insttoken']==='tok456', 'institutional token sent as a header');
$raw=file_get_contents("$site/data/content.json");
check(!str_contains($raw,'abc123') && !str_contains($raw,'tok456'), 'key and token never written to content.json');
check($cj['faculty'][0]['orcid']==='0000-0001-7490-5134' && $cj['faculty'][0]['openalex']==='A5048378082', 'ORCID and OpenAlex IDs kept');
echo $fails ? "\n$fails FAILED\n" : "\nall passed\n";
