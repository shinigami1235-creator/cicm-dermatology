<?php
/**
 * The editing screens: one tab per section, rows that open and close, add/move/remove buttons,
 * the media library for photos and files, a history tab to roll back, and settings.
 */
defined( 'ABSPATH' ) || exit;

const CICM_CAP = 'cicm_edit_content';

add_action( 'admin_menu', function () {
	add_menu_page( 'CICM Dermatology', 'CICM Dermatology', CICM_CAP, 'cicm', 'cicm_page', 'dashicons-welcome-learn-more', 3 );
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( 'toplevel_page_cicm' !== $hook ) {
		return;
	}
	wp_enqueue_media();
	wp_enqueue_style( 'cicm-admin', plugins_url( 'assets/admin.css', CICM_FILE ), array(), CICM_VERSION );
	wp_enqueue_script( 'cicm-admin', plugins_url( 'assets/admin.js', CICM_FILE ), array( 'jquery' ), CICM_VERSION, true );
} );

function cicm_tab_url( $tab, $args = array() ) {
	return add_query_arg( array_merge( array( 'page' => 'cicm', 'tab' => $tab ), $args ), admin_url( 'admin.php' ) );
}

function cicm_page() {
	if ( ! current_user_can( CICM_CAP ) ) {
		wp_die( 'You cannot edit the CICM Dermatology content.' );
	}
	$schema = cicm_schema();
	$tabs   = array_keys( $schema );
	$tab    = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'announcements';
	if ( ! in_array( $tab, array_merge( array_map( 'strtolower', $tabs ), array( 'history', 'settings' ) ), true ) ) {
		$tab = 'announcements';
	}
	foreach ( $tabs as $k ) {
		if ( strtolower( $k ) === $tab ) {
			$tab = $k;   // section keys keep their case (visitingGroups)
		}
	}
	$content = cicm_get_content();
	if ( ! $content && 'settings' !== $tab ) {
		echo '<div class="wrap"><h1>CICM Dermatology</h1><p>Nothing is loaded yet. Set the site folder under <a href="' . esc_url( cicm_tab_url( 'settings' ) ) . '">Settings</a>, then import the current site content.</p></div>';
		return;
	}
	echo '<div class="wrap cicm"><h1>CICM Dermatology</h1>';
	cicm_notices();
	echo '<nav class="nav-tab-wrapper">';
	foreach ( $schema as $k => $sec ) {
		echo '<a class="nav-tab' . ( $k === $tab ? ' nav-tab-active' : '' ) . '" href="' . esc_url( cicm_tab_url( strtolower( $k ) ) ) . '">' . esc_html( $sec['label'] ) . '</a>';
	}
	echo '<a class="nav-tab' . ( 'history' === $tab ? ' nav-tab-active' : '' ) . '" href="' . esc_url( cicm_tab_url( 'history' ) ) . '">History</a>';
	if ( current_user_can( 'manage_options' ) ) {
		echo '<a class="nav-tab' . ( 'settings' === $tab ? ' nav-tab-active' : '' ) . '" href="' . esc_url( cicm_tab_url( 'settings' ) ) . '">Settings</a>';
	}
	echo '</nav>';

	if ( 'history' === $tab ) {
		cicm_history_tab();
	} elseif ( 'settings' === $tab ) {
		cicm_settings_tab();
	} else {
		cicm_section_tab( $tab, $schema[ $tab ], $content );
	}
	echo '</div>';
}

function cicm_notices() {
	$n = get_transient( 'cicm_notice_' . get_current_user_id() );
	if ( ! $n ) {
		return;
	}
	delete_transient( 'cicm_notice_' . get_current_user_id() );
	foreach ( $n as $m ) {
		echo '<div class="notice notice-' . esc_attr( $m[0] ) . '"><p>' . esc_html( $m[1] ) . '</p></div>';
	}
}

function cicm_notice( $type, $msg ) {
	$key = 'cicm_notice_' . get_current_user_id();
	$n   = get_transient( $key ) ?: array();
	$n[] = array( $type, $msg );
	set_transient( $key, $n, 120 );
}

function cicm_group_ids( $content ) {
	$ids = array();
	foreach ( ( isset( $content['visitingGroups'] ) ? $content['visitingGroups'] : array() ) as $g ) {
		$ids[ $g['id'] ] = isset( $g['name']['en'] ) ? $g['name']['en'] : $g['id'];
	}
	return $ids;
}

function cicm_section_tab( $key, $sec, $content ) {
	$type = isset( $sec['type'] ) ? $sec['type'] : 'list';
	// a refused save keeps what was typed so nothing is lost
	$draft = get_transient( 'cicm_draft_' . get_current_user_id() . '_' . $key );
	$value = false !== $draft ? $draft : ( isset( $content[ $key ] ) ? $content[ $key ] : null );

	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="cicm-form">';
	wp_nonce_field( 'cicm_save_' . $key );
	echo '<input type="hidden" name="action" value="cicm_save"><input type="hidden" name="section" value="' . esc_attr( $key ) . '">';
	if ( ! empty( $sec['help'] ) ) {
		echo '<p class="description">' . esc_html( $sec['help'] ) . '</p>';
	}
	if ( 'url_lines' === $type ) {
		echo '<textarea name="cicm" rows="14" class="large-text code">' . esc_textarea( implode( "\n", (array) $value ) ) . '</textarea>';
	} elseif ( 'json' === $type ) {
		$text = is_string( $value ) ? $value : wp_json_encode( $value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		echo '<textarea name="cicm" rows="28" class="large-text code" spellcheck="false">' . esc_textarea( $text ) . '</textarea>';
	} elseif ( 'date' === $type ) {
		echo '<input type="text" pattern="\d{4}(-\d{2}(-\d{2})?)?" placeholder="2026-11-05" name="cicm" value="' . esc_attr( (string) $value ) . '">';
	} else {
		$groups = cicm_group_ids( $content );
		echo '<div class="cicm-rows" data-section="' . esc_attr( $key ) . '">';
		foreach ( (array) $value as $i => $row ) {
			cicm_row_html( $sec, 'cicm[' . (int) $i . ']', $row, $groups, false );
		}
		echo '</div><template class="cicm-tpl">';
		cicm_row_html( $sec, 'cicm[__i__]', array(), $groups, true );
		echo '</template><p><button type="button" class="button cicm-add">Add ' . esc_html( strtolower( rtrim( $sec['label'], 's' ) ) ) . '</button></p>';
	}
	submit_button( 'Save and publish' );
	echo '</form>';
}

function cicm_row_title( $sec, $row ) {
	$t = cicm_get_path( $row, $sec['item'] );
	return is_array( $t ) ? ( isset( $t['en'] ) ? $t['en'] : '' ) : (string) $t;
}

function cicm_row_html( $sec, $base, $row, $groups, $open ) {
	$title = cicm_row_title( $sec, $row );
	echo '<details class="cicm-row"' . ( $open ? ' open' : '' ) . '><summary><span class="cicm-title">' . esc_html( '' !== $title ? $title : 'New' ) . '</span>' .
		'<span class="cicm-tools"><button type="button" class="button-link cicm-up" aria-label="Move up">&uarr;</button><button type="button" class="button-link cicm-down" aria-label="Move down">&darr;</button>' .
		'<button type="button" class="button-link cicm-del">Remove</button></span></summary><div class="cicm-fields">';
	foreach ( $sec['fields'] as $fk => $f ) {
		cicm_field_html( $base . '[' . $fk . ']', $f, cicm_get_path( $row, $fk ), $groups, $fk === $sec['item'] );
	}
	echo '</div></details>';
}

function cicm_field_html( $name, $f, $v, $groups, $is_title ) {
	$id   = 'f' . substr( md5( $name ), 0, 10 );
	$cls  = $is_title ? ' cicm-title-src' : '';
	$hint = isset( $f['hint'] ) ? $f['hint'] : '';
	echo '<div class="cicm-field cicm-' . esc_attr( $f['type'] ) . '"><label for="' . esc_attr( $id ) . '">' . esc_html( $f['label'] ) . '</label>';
	switch ( $f['type'] ) {
		case 'i18n':
		case 'i18n_area':
			$v = is_array( $v ) ? $v : array( 'en' => (string) $v, 'th' => '' );
			foreach ( array( 'en' => 'English', 'th' => 'ไทย' ) as $lang => $lab ) {
				$val = isset( $v[ $lang ] ) ? $v[ $lang ] : '';
				$fid = 'en' === $lang ? $id : $id . 'th';
				echo '<span class="cicm-lang"><small>' . esc_html( $lab ) . '</small>';
				if ( 'i18n_area' === $f['type'] ) {
					echo '<textarea id="' . esc_attr( $fid ) . '" name="' . esc_attr( $name . '[' . $lang . ']' ) . '" rows="3" class="large-text' . ( 'en' === $lang ? $cls : '' ) . '">' . esc_textarea( $val ) . '</textarea>';
				} else {
					echo '<input id="' . esc_attr( $fid ) . '" type="text" class="large-text' . ( 'en' === $lang ? $cls : '' ) . '" name="' . esc_attr( $name . '[' . $lang . ']' ) . '" value="' . esc_attr( $val ) . '" placeholder="' . esc_attr( 'en' === $lang ? $hint : '' ) . '">';
				}
				echo '</span>';
			}
			break;
		case 'lines':
			echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="4" class="large-text" placeholder="' . esc_attr( $hint ) . '">' . esc_textarea( implode( "\n", (array) $v ) ) . '</textarea>';
			break;
		case 'textarea':
			echo '<textarea id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="3" class="large-text">' . esc_textarea( (string) $v ) . '</textarea>';
			break;
		case 'bool':
			echo '<input id="' . esc_attr( $id ) . '" type="checkbox" name="' . esc_attr( $name ) . '" value="1"' . checked( ! empty( $v ), true, false ) . '>';
			break;
		case 'select':
		case 'group_ref':
			$opts = 'select' === $f['type'] ? $f['options'] : $groups;
			echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '">';
			foreach ( $opts as $ov => $ol ) {
				echo '<option value="' . esc_attr( $ov ) . '"' . selected( (string) $v, (string) $ov, false ) . '>' . esc_html( $ol ) . '</option>';
			}
			echo '</select>';
			break;
		case 'media':
			echo '<span class="cicm-media"><input id="' . esc_attr( $id ) . '" type="text" class="regular-text" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '">' .
				'<button type="button" class="button cicm-pick">Choose from media</button></span>';
			break;
		case 'number':
			$step = isset( $f['step'] ) ? $f['step'] : '1';
			echo '<input id="' . esc_attr( $id ) . '" type="number" step="' . esc_attr( $step ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( '' === $v || null === $v ? '' : (string) $v ) . '">';
			break;
		case 'date':
			echo '<input id="' . esc_attr( $id ) . '" type="text" pattern="\d{4}(-\d{2}(-\d{2})?)?" placeholder="' . esc_attr( $hint ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '">';
			break;
		case 'url':
			echo '<span class="cicm-media"><input id="' . esc_attr( $id ) . '" type="text" class="regular-text" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '" placeholder="' . esc_attr( $hint ) . '">' .
				'<button type="button" class="button cicm-pick">Choose a file</button></span>';
			break;
		default:
			echo '<input id="' . esc_attr( $id ) . '" type="text" class="regular-text' . $cls . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $v ) . '" placeholder="' . esc_attr( $hint ) . '">';
	}
	if ( $hint && ! in_array( $f['type'], array( 'text', 'i18n', 'lines', 'url' ), true ) ) {
		echo '<p class="description">' . esc_html( $hint ) . '</p>';
	}
	echo '</div>';
}

add_action( 'admin_post_cicm_save', function () {
	if ( ! current_user_can( CICM_CAP ) ) {
		wp_die( 'You cannot edit the CICM Dermatology content.', 403 );
	}
	$schema = cicm_schema();
	$key    = isset( $_POST['section'] ) ? sanitize_text_field( wp_unslash( $_POST['section'] ) ) : '';
	if ( ! isset( $schema[ $key ] ) ) {
		wp_die( 'Unknown section.', 400 );
	}
	check_admin_referer( 'cicm_save_' . $key );

	$posted  = isset( $_POST['cicm'] ) ? wp_unslash( $_POST['cicm'] ) : array();   // cleaned below by the schema
	$content = cicm_get_content();
	$content[ $key ] = is_array( $posted ) ? array_values( $posted ) : $posted;
	list( $clean, $errors ) = cicm_clean_content( $content );
	$draft_key = 'cicm_draft_' . get_current_user_id() . '_' . $key;

	if ( $errors ) {
		set_transient( $draft_key, $content[ $key ], 600 );
		foreach ( $errors as $e ) {
			cicm_notice( 'error', $e );
		}
		cicm_notice( 'warning', 'Nothing was saved. Fix the items above and save again.' );
	} else {
		delete_transient( $draft_key );
		$r = cicm_save_content( $clean );
		if ( is_wp_error( $r ) ) {
			cicm_notice( 'warning', 'Saved in WordPress, but the site was not updated: ' . $r->get_error_message() );
		} else {
			cicm_notice( 'success', $schema[ $key ]['label'] . ' saved. The site shows the change on the next page load.' );
		}
	}
	wp_safe_redirect( cicm_tab_url( strtolower( $key ) ) );
	exit;
} );

function cicm_history_tab() {
	$revs = get_option( CICM_OPT_REVS, array() );
	echo '<p class="description">The last ' . (int) CICM_MAX_REVS . ' saves. Restoring one saves it again as the current content.</p>';
	if ( ! $revs ) {
		echo '<p>No earlier versions yet.</p>';
		return;
	}
	echo '<table class="widefat striped"><thead><tr><th>Saved</th><th>By</th><th></th></tr></thead><tbody>';
	foreach ( $revs as $i => $r ) {
		$u = get_userdata( (int) $r['user'] );
		echo '<tr><td>' . esc_html( wp_date( 'j M Y, H:i', (int) $r['time'] ) ) . '</td><td>' . esc_html( $u ? $u->display_name : '-' ) . '</td><td>' .
			'<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">' . wp_nonce_field( 'cicm_restore', '_wpnonce', true, false ) .
			'<input type="hidden" name="action" value="cicm_restore"><input type="hidden" name="rev" value="' . (int) $i . '"><button class="button">Restore this version</button></form></td></tr>';
	}
	echo '</tbody></table>';
}

add_action( 'admin_post_cicm_restore', function () {
	if ( ! current_user_can( CICM_CAP ) ) {
		wp_die( 'You cannot edit the CICM Dermatology content.', 403 );
	}
	check_admin_referer( 'cicm_restore' );
	$r = cicm_restore_revision( isset( $_POST['rev'] ) ? absint( $_POST['rev'] ) : -1 );
	cicm_notice( is_wp_error( $r ) ? 'error' : 'success', is_wp_error( $r ) ? $r->get_error_message() : 'Version restored and published.' );
	wp_safe_redirect( cicm_tab_url( 'history' ) );
	exit;
} );

function cicm_settings_tab() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$dir = cicm_site_dir();
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'cicm_settings' );
	echo '<input type="hidden" name="action" value="cicm_settings"><table class="form-table">';
	echo '<tr><th><label for="cicm_dir">Site folder on the server</label></th><td><input id="cicm_dir" class="large-text code" name="cicm_site_dir" value="' . esc_attr( $dir ) . '"' . ( defined( 'CICM_SITE_DIR' ) ? ' disabled' : '' ) . ' placeholder="/var/www/html/dermatology">' .
		'<p class="description">The folder that holds index.html. ' . ( cicm_site_dir_ok( $dir ) ? 'Found the site there.' : 'No site found there yet.' ) . ( defined( 'CICM_SITE_DIR' ) ? ' Set in wp-config.php.' : '' ) . '</p></td></tr>';
	echo '<tr><th><label for="cicm_url">Site address</label></th><td><input id="cicm_url" class="large-text code" name="cicm_site_url" value="' . esc_attr( cicm_site_url() ) . '"' . ( defined( 'CICM_SITE_URL' ) ? ' disabled' : '' ) . ' placeholder="https://cicm.tu.ac.th/dermatology/">' .
		'<p class="description">Visitors who open WordPress pages outside the dashboard are sent here.</p></td></tr></table>';
	submit_button( 'Save settings' );
	echo '</form><hr><h2>Import</h2><p>Copies what the site shows now (data/content.json) into WordPress. It replaces the content stored here, and the current version stays in History.</p>' .
		'<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">' . wp_nonce_field( 'cicm_import', '_wpnonce', true, false ) .
		'<input type="hidden" name="action" value="cicm_import"><button class="button">Import from the site</button></form>';
}

add_action( 'admin_post_cicm_settings', function () {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Only administrators can change these settings.', 403 );
	}
	check_admin_referer( 'cicm_settings' );
	if ( ! defined( 'CICM_SITE_DIR' ) && isset( $_POST['cicm_site_dir'] ) ) {
		$dir = rtrim( sanitize_text_field( wp_unslash( $_POST['cicm_site_dir'] ) ), '/\\' );
		if ( '' === $dir || cicm_site_dir_ok( $dir ) ) {
			update_option( 'cicm_site_dir', $dir );
		} else {
			cicm_notice( 'error', 'No site found in ' . $dir . '. The folder must hold index.html, js/site.js and a data folder.' );
		}
	}
	if ( ! defined( 'CICM_SITE_URL' ) && isset( $_POST['cicm_site_url'] ) ) {
		update_option( 'cicm_site_url', esc_url_raw( wp_unslash( $_POST['cicm_site_url'] ), array( 'http', 'https' ) ) );
	}
	cicm_notice( 'success', 'Settings saved.' );
	wp_safe_redirect( cicm_tab_url( 'settings' ) );
	exit;
} );

add_action( 'admin_post_cicm_import', function () {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Only administrators can import.', 403 );
	}
	check_admin_referer( 'cicm_import' );
	$prev = get_option( CICM_OPT, '' );
	if ( $prev ) {
		$revs = get_option( CICM_OPT_REVS, array() );
		array_unshift( $revs, array( 'time' => time(), 'user' => get_current_user_id(), 'json' => $prev ) );
		update_option( CICM_OPT_REVS, array_slice( $revs, 0, CICM_MAX_REVS ), false );
	}
	$r = cicm_import_from_site();
	if ( is_wp_error( $r ) ) {
		cicm_notice( 'error', $r->get_error_message() );
	} else {
		cicm_notice( 'success', 'Imported the site content.' );
		foreach ( $r as $e ) {
			cicm_notice( 'warning', $e );
		}
	}
	wp_safe_redirect( cicm_tab_url( 'settings' ) );
	exit;
} );
