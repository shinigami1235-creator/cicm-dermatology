<?php
/**
 * Research sources tab: where the paper list and the citation numbers come from, the Scopus key and
 * institutional token (kept in their own options, never in content.json), and buttons that refresh the
 * Scopus numbers and the OpenAlex citation counts. Both refreshes also run once a week on their own.
 */
defined( 'ABSPATH' ) || exit;

const CICM_OPENALEX_MAIL = 'derm.admission@gmail.com';   // OpenAlex asks callers to give a contact address

/* ---------- pure helpers (no WordPress calls, covered by tests/test.php) ---------- */

/** Documents, citations and h-index from an Author Retrieval response (view=METRICS). Null when the response is not one. */
function cicm_scopus_metrics( $json ) {
	$r = is_array( $json ) && isset( $json['author-retrieval-response'][0] ) ? $json['author-retrieval-response'][0] : null;
	if ( ! $r || ! isset( $r['coredata'] ) ) {
		return null;
	}
	$core = $r['coredata'];
	return array(
		'docs'  => (int) ( $core['document-count'] ?? 0 ),
		'cites' => (int) ( $core['citation-count'] ?? $core['cited-by-count'] ?? 0 ),
		'h'     => (int) ( $r['h-index'] ?? 0 ),
	);
}

/** Puts OpenAlex citation counts (work ID => count) onto the papers that carry those IDs. Returns the number changed. */
function cicm_apply_cites( &$pubs, $counts ) {
	$n = 0;
	foreach ( $pubs['papers'] as &$p ) {
		if ( ! empty( $p['oa'] ) && isset( $counts[ $p['oa'] ] ) ) {
			$c = (int) $counts[ $p['oa'] ];
			if ( ! isset( $p['cites'] ) || (int) $p['cites'] !== $c ) {
				$n++;
			}
			$p['cites'] = $c;
		}
	}
	unset( $p );
	return $n;
}

/** OpenAlex IDs look like W2409710963 (works) or A5048378082 (authors). */
function cicm_openalex_id_ok( $id, $kind ) {
	return (bool) preg_match( '/^' . $kind . '\d{4,12}$/', (string) $id );
}

/* ---------- credentials ---------- */

/** wp-config.php can hold them instead: define( 'CICM_SCOPUS_KEY', '...' ); define( 'CICM_SCOPUS_INSTTOKEN', '...' ); */
function cicm_scopus_key() {
	return defined( 'CICM_SCOPUS_KEY' ) ? CICM_SCOPUS_KEY : (string) get_option( 'cicm_scopus_key', '' );
}
function cicm_scopus_token() {
	return defined( 'CICM_SCOPUS_INSTTOKEN' ) ? CICM_SCOPUS_INSTTOKEN : (string) get_option( 'cicm_scopus_token', '' );
}

/* ---------- refreshes ---------- */

/** Reads each lecturer's Scopus profile through the Author Retrieval API and saves the numbers. Returns a message list. */
function cicm_refresh_scopus() {
	$key = cicm_scopus_key();
	if ( '' === $key ) {
		return new WP_Error( 'cicm_scopus_key', 'Enter the Elsevier API key first.' );
	}
	$headers = array( 'X-ELS-APIKey' => $key, 'Accept' => 'application/json' );
	if ( '' !== cicm_scopus_token() ) {
		$headers['X-ELS-Insttoken'] = cicm_scopus_token();
	}
	$c    = cicm_get_content();
	$done = array();
	$fail = array();
	foreach ( $c['faculty'] as &$f ) {
		$id = isset( $f['scopus']['id'] ) ? preg_replace( '/\D/', '', (string) $f['scopus']['id'] ) : '';
		if ( '' === $id ) {
			continue;
		}
		$res  = wp_remote_get( 'https://api.elsevier.com/content/author/author_id/' . $id . '?view=METRICS', array( 'headers' => $headers, 'timeout' => 20 ) );
		$code = wp_remote_retrieve_response_code( $res );
		$m    = is_wp_error( $res ) ? null : cicm_scopus_metrics( json_decode( wp_remote_retrieve_body( $res ), true ) );
		if ( 200 !== $code || ! $m ) {
			$fail[] = $f['name'] . ( 401 === $code || 403 === $code ? ' (Scopus refused the key; from outside the Thammasat network it also needs the institutional token)' : ( is_wp_error( $res ) ? ' (' . $res->get_error_message() . ')' : ' (HTTP ' . $code . ')' ) );
			continue;
		}
		$f['scopus'] = array_merge( $f['scopus'], $m );
		$done[]      = $f['name'];
	}
	unset( $f );
	if ( ! $done ) {
		return new WP_Error( 'cicm_scopus', 'No Scopus numbers were updated: ' . implode( '; ', $fail ) );
	}
	$c['scopusUpdated'] = current_time( 'Y-m-d' );
	list( $clean ) = cicm_clean_content( $c );
	$w   = cicm_save_content( $clean + array( 'updated' => '' ) );
	$out = array( array( 'success', 'Scopus numbers updated for ' . implode( ', ', $done ) . '.' ) );
	if ( $fail ) {
		$out[] = array( 'warning', 'Not updated: ' . implode( '; ', $fail ) );
	}
	if ( is_wp_error( $w ) ) {
		$out[] = array( 'error', $w->get_error_message() );
	}
	return $out;
}

/** Fetches the current OpenAlex citation count for every paper and rewrites data/publications.json. */
function cicm_refresh_openalex() {
	$dir = cicm_site_dir();
	if ( ! cicm_site_dir_ok( $dir ) ) {
		return new WP_Error( 'cicm_dir', 'The site folder is not set. Set it under Settings.' );
	}
	$file = $dir . '/data/publications.json';
	$pubs = json_decode( (string) @file_get_contents( $file ), true );
	if ( ! is_array( $pubs ) || ! isset( $pubs['papers'] ) ) {
		return new WP_Error( 'cicm_pubs', 'data/publications.json could not be read.' );
	}
	$ids = array();
	foreach ( $pubs['papers'] as $p ) {
		if ( ! empty( $p['oa'] ) && cicm_openalex_id_ok( $p['oa'], 'W' ) ) {
			$ids[] = $p['oa'];
		}
	}
	$counts = array();
	foreach ( array_chunk( array_unique( $ids ), 50 ) as $chunk ) {
		$res = wp_remote_get( 'https://api.openalex.org/works?per_page=50&select=id,cited_by_count&mailto=' . rawurlencode( CICM_OPENALEX_MAIL ) . '&filter=openalex:' . implode( '|', $chunk ), array( 'timeout' => 30 ) );
		$j   = is_wp_error( $res ) ? null : json_decode( wp_remote_retrieve_body( $res ), true );
		if ( ! isset( $j['results'] ) ) {
			return new WP_Error( 'cicm_openalex', 'OpenAlex did not answer' . ( is_wp_error( $res ) ? ': ' . $res->get_error_message() : '.' ) . ' Nothing was changed.' );
		}
		foreach ( $j['results'] as $w ) {
			$counts[ basename( $w['id'] ) ] = (int) $w['cited_by_count'];
		}
	}
	$n                   = cicm_apply_cites( $pubs, $counts );
	$pubs['citesUpdated'] = current_time( 'Y-m-d' );
	$tmp = $file . '.tmp-' . wp_generate_password( 8, false );
	if ( false === file_put_contents( $tmp, wp_json_encode( $pubs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . "\n", LOCK_EX ) || ! rename( $tmp, $file ) ) {
		@unlink( $tmp );
		return new WP_Error( 'cicm_write', 'Could not write ' . $file . '. The web server user needs write access to the data folder.' );
	}
	return array( array( 'success', 'Citation counts updated from OpenAlex: ' . count( $counts ) . ' papers checked, ' . $n . ' changed.' ) );
}

/** Works by the lecturers in OpenAlex that the list does not have yet, for staff to check. */
function cicm_openalex_candidates() {
	$dir  = cicm_site_dir();
	$pubs = cicm_site_dir_ok( $dir ) ? json_decode( (string) @file_get_contents( $dir . '/data/publications.json' ), true ) : null;
	if ( ! is_array( $pubs ) ) {
		return new WP_Error( 'cicm_pubs', 'data/publications.json could not be read.' );
	}
	$have = array();
	foreach ( $pubs['papers'] as $p ) {
		$have[ strtolower( (string) $p['doi'] ) ] = 1;
		$have[ (string) ( $p['oa'] ?? '' ) ]      = 1;
	}
	$authors = array();
	foreach ( cicm_get_content()['faculty'] as $f ) {
		if ( ! empty( $f['openalex'] ) && cicm_openalex_id_ok( $f['openalex'], 'A' ) ) {
			$authors[] = $f['openalex'];
		}
	}
	if ( ! $authors ) {
		return new WP_Error( 'cicm_oa', 'No lecturer has an OpenAlex author ID yet (Permanent lecturers tab).' );
	}
	$res = wp_remote_get( 'https://api.openalex.org/works?per_page=100&sort=publication_date:desc&select=id,doi,display_name,publication_year,type,primary_location&mailto=' . rawurlencode( CICM_OPENALEX_MAIL ) .
		'&filter=type:article|review|book-chapter,author.id:' . implode( '|', $authors ), array( 'timeout' => 30 ) );
	$j   = is_wp_error( $res ) ? null : json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! isset( $j['results'] ) ) {
		return new WP_Error( 'cicm_openalex', 'OpenAlex did not answer.' );
	}
	$out = array();
	foreach ( $j['results'] as $w ) {
		$doi = strtolower( str_replace( 'https://doi.org/', '', (string) $w['doi'] ) );
		if ( isset( $have[ basename( $w['id'] ) ] ) || ( $doi && isset( $have[ $doi ] ) ) || preg_match( '/^(author )?correction|^erratum|^\d+ /i', (string) $w['display_name'] ) ) {
			continue;
		}
		$out[] = array(
			'year'    => (int) $w['publication_year'],
			'title'   => (string) $w['display_name'],
			'journal' => (string) ( $w['primary_location']['source']['display_name'] ?? '' ),
			'link'    => $doi ? 'https://doi.org/' . $doi : (string) $w['id'],
		);
	}
	return $out;
}

/* ---------- the tab ---------- */

function cicm_research_tab() {
	$c       = cicm_get_content();
	$admin   = current_user_can( 'manage_options' );
	$form    = function ( $action, $label, $primary = false ) {
		return '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="display:inline-block;margin-right:8px">' . wp_nonce_field( $action, '_wpnonce', true, false ) .
			'<input type="hidden" name="action" value="' . esc_attr( $action ) . '"><button class="button' . ( $primary ? ' button-primary' : '' ) . '">' . esc_html( $label ) . '</button></form>';
	};
	echo '<div class="cicm-research" style="max-width:860px">';
	echo '<p>The research section reads two files. <code>data/publications.json</code> holds the paper list with each paper\'s OpenAlex citation count, and the lecturers\' Scopus numbers sit with their profiles in the Permanent lecturers tab. This tab keeps both up to date and shows where each number comes from.</p>';

	echo '<h2>Sources</h2><table class="widefat striped"><thead><tr><th>Source</th><th>What it gives the site</th><th>Login</th></tr></thead><tbody>' .
		'<tr><td><a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener">PubMed</a></td><td>Most of the paper list, searched by each lecturer\'s name on PubMed (field "Name on PubMed").</td><td>None</td></tr>' .
		'<tr><td><a href="https://onlinelibrary.wiley.com/" target="_blank" rel="noopener">Wiley Online Library</a></td><td>Papers in Wiley journals, found through Crossref. Each one gets a Wiley link.</td><td>None</td></tr>' .
		'<tr><td><a href="https://openalex.org/" target="_blank" rel="noopener">OpenAlex</a></td><td>The citation count shown under each paper, Table 4, and papers outside PubMed such as book chapters (field "OpenAlex author ID").</td><td>None</td></tr>' .
		'<tr><td><a href="https://www.tci-thaijo.org/" target="_blank" rel="noopener">ThaiJO</a></td><td>Papers in Thai journals indexed by TCI.</td><td>None</td></tr>' .
		'<tr><td><a href="https://orcid.org/" target="_blank" rel="noopener">ORCID</a></td><td>A link to each lecturer\'s own record (field "ORCID iD").</td><td>None</td></tr>' .
		'<tr><td><a href="https://www.scopus.com/" target="_blank" rel="noopener">Scopus</a></td><td>Documents, citations and h-index in Table 3 (field "Scopus author ID").</td><td>Elsevier API key, plus an institutional token when the server is outside the Thammasat network</td></tr>' .
		'</tbody></table>';

	echo '<h2>Citation counts (OpenAlex)</h2><p>Last updated: <strong>' . esc_html( cicm_pubs_meta( 'citesUpdated' ) ?: 'never' ) . '</strong>. This also runs once a week by itself.</p>';
	echo $form( 'cicm_refresh_openalex', 'Update citation counts now' ) . $form( 'cicm_check_openalex', 'Look for new papers in OpenAlex' );
	$cand = get_transient( 'cicm_oa_candidates_' . get_current_user_id() );
	if ( is_array( $cand ) ) {
		echo '<h3>In OpenAlex but not on the site (' . count( $cand ) . ')</h3>';
		if ( ! $cand ) {
			echo '<p>Nothing new.</p>';
		} else {
			echo '<p class="description">Check each one belongs to the lecturer, then send the list to whoever maintains the site so it can be added to data/publications.json (tools/wiley_check.py shows the format). Meeting abstracts and preprints are not listed on the site.</p><table class="widefat striped"><tbody>';
			foreach ( $cand as $w ) {
				echo '<tr><td>' . (int) $w['year'] . '</td><td><a href="' . esc_url( $w['link'] ) . '" target="_blank" rel="noopener">' . esc_html( $w['title'] ) . '</a><br><span class="description">' . esc_html( $w['journal'] ) . '</span></td></tr>';
			}
			echo '</tbody></table>';
		}
	}

	echo '<h2>Scopus numbers</h2><p>Last updated: <strong>' . esc_html( $c['scopusUpdated'] ?? 'never' ) . '</strong>.</p>';
	if ( '' === cicm_scopus_key() ) {
		echo '<p>Scopus needs a key, so these numbers stay as typed in the Permanent lecturers tab until one is entered below.</p>';
	} else {
		echo '<p>A key is set' . ( '' === cicm_scopus_token() ? ' without an institutional token, which works only while this server is on the Thammasat network' : ' with an institutional token' ) . '. This also runs once a week by itself.</p>' . $form( 'cicm_refresh_scopus', 'Update Scopus numbers now' );
	}

	if ( $admin ) {
		echo '<h3>Setting up Scopus</h3><ol>' .
			'<li>Sign in at <a href="https://dev.elsevier.com/" target="_blank" rel="noopener">dev.elsevier.com</a> with a Thammasat email, open "My API Key" and create a key. Give it a name such as "CICM Dermatology website" and the site address.</li>' .
			'<li>Thammasat subscribes to Scopus, so the key works for the Author Retrieval API as long as this server sits on the Thammasat network. If the server is elsewhere, ask the Thammasat library to request an institutional token from Elsevier for this key. The token is tied to the key.</li>' .
			'<li>Paste the key, and the token if there is one, below and save. They are stored in WordPress only and never written to the site files. An administrator can put them in wp-config.php instead: <code>define( \'CICM_SCOPUS_KEY\', \'...\' );</code> and <code>define( \'CICM_SCOPUS_INSTTOKEN\', \'...\' );</code></li>' .
			'<li>Press "Update Scopus numbers now". Each lecturer with a Scopus author ID gets their documents, citations and h-index refreshed, and the change shows up in History.</li></ol>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">' . wp_nonce_field( 'cicm_scopus_keys', '_wpnonce', true, false ) .
			'<input type="hidden" name="action" value="cicm_scopus_keys"><table class="form-table">' .
			'<tr><th><label for="cicm_sk">Elsevier API key</label></th><td><input id="cicm_sk" class="regular-text code" name="cicm_scopus_key" type="password" autocomplete="off" value=""' . ( defined( 'CICM_SCOPUS_KEY' ) ? ' disabled' : '' ) . ' placeholder="' . ( cicm_scopus_key() ? 'Saved. Type a new key to replace it.' : '32 letters and numbers' ) . '"></td></tr>' .
			'<tr><th><label for="cicm_st">Institutional token</label></th><td><input id="cicm_st" class="regular-text code" name="cicm_scopus_token" type="password" autocomplete="off" value=""' . ( defined( 'CICM_SCOPUS_INSTTOKEN' ) ? ' disabled' : '' ) . ' placeholder="' . ( cicm_scopus_token() ? 'Saved. Type a new token to replace it.' : 'Only if the library got one' ) . '">' .
			'<p><label><input type="checkbox" name="cicm_scopus_clear" value="1"> Remove the saved key and token</label></p></td></tr></table>';
		submit_button( 'Save Scopus settings' );
		echo '</form>';
	}
	echo '</div>';
}

/** One field from the top of data/publications.json, such as citesUpdated. */
function cicm_pubs_meta( $k ) {
	$dir = cicm_site_dir();
	if ( ! cicm_site_dir_ok( $dir ) ) {
		return '';
	}
	$p = json_decode( (string) @file_get_contents( $dir . '/data/publications.json' ), true );
	return is_array( $p ) && isset( $p[ $k ] ) ? (string) $p[ $k ] : '';
}

/* ---------- form handlers ---------- */

function cicm_research_done( $r ) {
	if ( is_wp_error( $r ) ) {
		cicm_notice( 'error', $r->get_error_message() );
	} else {
		foreach ( $r as $m ) {
			cicm_notice( $m[0], $m[1] );
		}
	}
	wp_safe_redirect( cicm_tab_url( 'research' ) );
	exit;
}

add_action( 'admin_post_cicm_refresh_openalex', function () {
	current_user_can( CICM_CAP ) || wp_die( 'You cannot edit the CICM Dermatology content.', 403 );
	check_admin_referer( 'cicm_refresh_openalex' );
	cicm_research_done( cicm_refresh_openalex() );
} );

add_action( 'admin_post_cicm_check_openalex', function () {
	current_user_can( CICM_CAP ) || wp_die( 'You cannot edit the CICM Dermatology content.', 403 );
	check_admin_referer( 'cicm_check_openalex' );
	$r = cicm_openalex_candidates();
	if ( ! is_wp_error( $r ) ) {
		set_transient( 'cicm_oa_candidates_' . get_current_user_id(), $r, HOUR_IN_SECONDS );
		$r = array();
	}
	cicm_research_done( $r );
} );

add_action( 'admin_post_cicm_refresh_scopus', function () {
	current_user_can( CICM_CAP ) || wp_die( 'You cannot edit the CICM Dermatology content.', 403 );
	check_admin_referer( 'cicm_refresh_scopus' );
	cicm_research_done( cicm_refresh_scopus() );
} );

add_action( 'admin_post_cicm_scopus_keys', function () {
	current_user_can( 'manage_options' ) || wp_die( 'Only administrators can change the Scopus key.', 403 );
	check_admin_referer( 'cicm_scopus_keys' );
	if ( ! empty( $_POST['cicm_scopus_clear'] ) ) {
		delete_option( 'cicm_scopus_key' );
		delete_option( 'cicm_scopus_token' );
		cicm_research_done( array( array( 'success', 'Scopus key and token removed.' ) ) );
	}
	foreach ( array( 'cicm_scopus_key', 'cicm_scopus_token' ) as $k ) {
		$v = isset( $_POST[ $k ] ) ? preg_replace( '/[^A-Za-z0-9]/', '', (string) wp_unslash( $_POST[ $k ] ) ) : '';
		if ( '' !== $v ) {
			update_option( $k, $v, false );
		}
	}
	cicm_research_done( array( array( 'success', 'Scopus settings saved.' ) ) );
} );

/* ---------- weekly refresh ---------- */

add_action( 'cicm_weekly_research', function () {
	cicm_refresh_openalex();
	if ( '' !== cicm_scopus_key() ) {
		cicm_refresh_scopus();
	}
} );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'cicm_weekly_research' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'weekly', 'cicm_weekly_research' );
	}
} );
