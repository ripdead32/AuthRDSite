/* =========================================================
   RIP_DEAD ACCOUNT GLOBAL
========================================================= */

(function () {
    "use strict";

    const DOWN_PAGE = "/down/";

    function isDownPage() {
        return (
            window.location.pathname === "/down/" ||
            window.location.pathname === "/down/index.html"
        );
    }

    function isSupabaseUnavailableError(error) {
        if (!error) {
            return false;
        }

        const name =
            String(error.name || "").toLowerCase();

        const message =
            String(error.message || "").toLowerCase();

        /*
         * Supabase Auth retryable network error.
         */
        if (
            name ===
            "authretryablefetcherror"
        ) {
            return true;
        }

        /*
         * Browser/network failures.
         */
        const networkErrors = [
            "failed to fetch",
            "networkerror",
            "network request failed",
            "load failed",
            "fetch failed",
            "connection refused",
            "connection reset",
            "network is unreachable",
            "offline"
        ];

        return networkErrors.some(
            text => message.includes(text)
        );
    }

    function redirectToDownPage() {
        if (isDownPage()) {
            return;
        }

        window.location.href =
            DOWN_PAGE;
    }

    /*
     * Public helper for auth.js and other scripts.
     */
    window.RipDeadGlobal = {
        isSupabaseUnavailableError,
        redirectToDownPage
    };
})();