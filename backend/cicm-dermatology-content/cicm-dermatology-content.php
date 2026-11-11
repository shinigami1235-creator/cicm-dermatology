<?php
/**
 * Plugin Name: CICM Dermatology Content
 * Description: Staff edit the CICM Dermatology site (lecturers, announcements, programs and fees, downloads, partners) here. Each save writes data/content.json, which the site reads.
 * Version: 1.0.0
 * Requires at least: 6.4
 * Requires PHP: 8.1
 * Author: CICM Dermatology
 * License: GPL-2.0-or-later
 */
defined( 'ABSPATH' ) || exit;

const CICM_VERSION = '1.0.0';
const CICM_FILE    = __FILE__;

require __DIR__ . '/includes/schema.php';
require __DIR__ . '/includes/sanitize.php';
require __DIR__ . '/includes/store.php';
require __DIR__ . '/includes/admin.php';

/* Administrators and Editors can edit the content; give staff the Editor role. */
register_activation_hook( __FILE__, function () {
	foreach ( array( 'administrator', 'editor' ) as $r ) {
		$role = get_role( $r );
		if ( $role ) {
			$role->add_cap( 'cicm_edit_content' );
		}
	}
} );
register_deactivation_hook( __FILE__, function () {
	foreach ( array( 'administrator', 'editor' ) as $r ) {
		$role = get_role( $r );
		if ( $role ) {
			$role->remove_cap( 'cicm_edit_content' );
		}
	}
} );

/* The same content as JSON, for anything else that wants it: /wp-json/cicm/v1/content */
add_action( 'rest_api_init', function () {
	register_rest_route( 'cicm/v1', '/content', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',   // the same data is public on the site
		'callback'            => function () {
			return rest_ensure_response( cicm_get_content() );
		},
	) );
} );

/* WordPress here is only the editing back office. Its own pages send visitors to the site. */
add_action( 'template_redirect', function () {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || is_user_logged_in() && is_preview() ) {
		return;
	}
	$to = cicm_site_url();
	if ( $to ) {
		wp_redirect( esc_url_raw( $to ), 302 );
		exit;
	}
} );
