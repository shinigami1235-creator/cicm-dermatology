<?php
/**
 * Where the content lives: one WordPress option holds the current version, another the last 15 saves
 * for rollback, and every save also writes data/content.json into the site folder so the static site
 * picks it up with no other change.
 */
defined( 'ABSPATH' ) || exit;

const CICM_OPT      = 'cicm_content';
const CICM_OPT_REVS = 'cicm_content_revisions';
const CICM_MAX_REVS = 15;

/** The site folder (the one with index.html). wp-config.php can fix it with define( 'CICM_SITE_DIR', '/var/www/html/dermatology' ). */
function cicm_site_dir() {
	$dir = defined( 'CICM_SITE_DIR' ) ? CICM_SITE_DIR : get_option( 'cicm_site_dir', '' );
	return rtrim( (string) $dir, '/\\' );
}

/** The folder is accepted only if it looks like the site, so a wrong setting cannot write a file anywhere else. */
function cicm_site_dir_ok( $dir ) {
	return '' !== $dir && is_file( $dir . '/index.html' ) && is_dir( $dir . '/data' ) && is_file( $dir . '/js/site.js' );
}

function cicm_site_url() {
	return defined( 'CICM_SITE_URL' ) ? CICM_SITE_URL : get_option( 'cicm_site_url', home_url( '/../' ) );
}

function cicm_get_content() {
	$raw = get_option( CICM_OPT, '' );
	$c   = $raw ? json_decode( $raw, true ) : null;
	return is_array( $c ) ? $c : array();
}

function cicm_json( $c ) {
	return wp_json_encode( $c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
}

/**
 * Saves clean content: keeps the previous version for rollback, stores the new one, writes the site file.
 * Returns true, or a WP_Error when the site file could not be written (the content is still stored).
 */
function cicm_save_content( $c ) {
	$c['updated'] = current_time( 'Y-m-d' );
	$prev = get_option( CICM_OPT, '' );
	if ( $prev ) {
		$revs = get_option( CICM_OPT_REVS, array() );
		array_unshift( $revs, array( 'time' => time(), 'user' => get_current_user_id(), 'json' => $prev ) );
		update_option( CICM_OPT_REVS, array_slice( $revs, 0, CICM_MAX_REVS ), false );
	}
	update_option( CICM_OPT, cicm_json( $c ), false );
	return cicm_write_site_file( $c );
}

/** Writes data/content.json next to the site through a temporary file and a rename, so visitors never read half a file. */
function cicm_write_site_file( $c ) {
	$dir = cicm_site_dir();
	if ( ! cicm_site_dir_ok( $dir ) ) {
		return new WP_Error( 'cicm_dir', 'The site folder is not set or does not hold the site. Set it under CICM Dermatology > Settings.' );
	}
	$file = $dir . '/data/content.json';
	$tmp  = $file . '.tmp-' . wp_generate_password( 8, false );
	$ok   = false !== file_put_contents( $tmp, cicm_json( $c ) . "\n", LOCK_EX );
	if ( $ok ) {
		@chmod( $tmp, 0644 );
		$ok = rename( $tmp, $file );
	}
	if ( ! $ok ) {
		@unlink( $tmp );
		return new WP_Error( 'cicm_write', 'Could not write ' . $file . '. The web server user needs write access to the data folder.' );
	}
	return true;
}

/** First run: copy what the site already shows into WordPress. */
function cicm_import_from_site() {
	$dir = cicm_site_dir();
	if ( ! cicm_site_dir_ok( $dir ) ) {
		return new WP_Error( 'cicm_dir', 'The site folder is not set or does not hold the site.' );
	}
	$raw = file_get_contents( $dir . '/data/content.json' );
	$in  = $raw ? json_decode( $raw, true ) : null;
	if ( ! is_array( $in ) ) {
		return new WP_Error( 'cicm_json', 'data/content.json could not be read.' );
	}
	list( $clean, $errors ) = cicm_clean_content( $in );
	update_option( CICM_OPT, cicm_json( $clean + array( 'updated' => isset( $in['updated'] ) ? $in['updated'] : '' ) ), false );
	return $errors;
}

function cicm_restore_revision( $i ) {
	$revs = get_option( CICM_OPT_REVS, array() );
	if ( ! isset( $revs[ $i ] ) ) {
		return new WP_Error( 'cicm_rev', 'That version no longer exists.' );
	}
	$c = json_decode( $revs[ $i ]['json'], true );
	return is_array( $c ) ? cicm_save_content( $c ) : new WP_Error( 'cicm_rev', 'That version could not be read.' );
}
