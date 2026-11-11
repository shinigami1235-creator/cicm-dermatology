<?php
// Minimal stand-ins for the WordPress functions the plugin uses, so its logic runs without WordPress.
define('ABSPATH', __DIR__ . '/');
$GLOBALS['opts'] = [];
class WP_Error { public $c; public $m; function __construct($c,$m){$this->c=$c;$this->m=$m;} function get_error_message(){return $this->m;} }
function is_wp_error($x){ return $x instanceof WP_Error; }
function sanitize_text_field($s){ $s=(string)$s; $s=preg_replace('/<[^>]*>/','',$s); $s=preg_replace('/[\r\n\t ]+/',' ',$s); return trim($s); }
function sanitize_textarea_field($s){ $s=(string)$s; $s=preg_replace('/<[^>]*>/','',$s); return trim($s); }
function sanitize_title($s){ $s=strtolower(trim((string)$s)); $s=preg_replace('/[^a-z0-9_\-]+/','-',$s); return trim($s,'-'); }
function esc_url_raw($u,$p=null){ return filter_var($u, FILTER_SANITIZE_URL); }
function wp_json_encode($d,$f=0){ return json_encode($d,$f); }
function wp_unslash($v){ return $v; }
function current_time($f){ return '2026-11-11'; }
function get_option($k,$d=false){ return $GLOBALS['opts'][$k] ?? $d; }
function update_option($k,$v,$a=null){ $GLOBALS['opts'][$k]=$v; return true; }
function get_current_user_id(){ return 1; }
function wp_generate_password($n,$s){ return substr(md5(mt_rand()),0,$n); }
