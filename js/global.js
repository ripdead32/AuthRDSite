/* =========================================================
   RIP_DEAD ACCOUNT
   GLOBAL SUPABASE AVAILABILITY
========================================================= */

(function () {
    "use strict";

    const SUPABASE_URL =
        "https://vcwfgyikbvfzgqiljmry.supabase.co";

    const DOWN_PAGE =
        "/down/";

    let checking = false;
    let siteDownShown = false;

    /* =========================================================
       DO NOT RUN ON DOWN PAGE
    ========================================================= */

    function isDownPage() {
        const path =
            window.location.pathname;

        return (
            path === "/down/" ||
            path === "/down/index.html"
        );
    }

    /* =========================================================
       CREATE DOWN SCREEN
    ========================================================= */

    function showSiteDown() {
        if (
            siteDownShown ||
            isDownPage()
        ) {
            return;
        }

        siteDownShown = true;

        const overlay =
            document.createElement("div");

        overlay.id =
            "ripdead-site-down";

        overlay.innerHTML = `
            <div class="ripdead-down-card">

                <div class="ripdead-down-logo">
                    RD
                </div>

                <div class="ripdead-down-status">
                    <span></span>
                    Temporarily unavailable
                </div>

                <h1>
                    Rip_Dead Account is down.
                </h1>

                <p>
                    We're having trouble connecting
                    to the Rip_Dead Account services
                    right now.
                </p>

                <div class="ripdead-down-notice">
                    This may be caused by the backend
                    being temporarily unavailable,
                    paused, or undergoing maintenance.

                    <br><br>

                    <strong>
                        Your account data has not been deleted.
                    </strong>
                </div>

                <div class="ripdead-down-buttons">

                    <button
                        id="ripdead-down-retry"
                    >
                        Try Again
                    </button>

                    <button
                        id="ripdead-down-home"
                    >
                        Return Home
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        addStyles();

        const retry =
            document.getElementById(
                "ripdead-down-retry"
            );

        const home =
            document.getElementById(
                "ripdead-down-home"
            );

        if (retry) {
            retry.onclick = () => {
                window.location.reload();
            };
        }

        if (home) {
            home.onclick = () => {
                window.location.href = "/";
            };
        }
    }

    /* =========================================================
       STYLES
    ========================================================= */

    function addStyles() {
        if (
            document.getElementById(
                "ripdead-site-down-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "ripdead-site-down-styles";

        style.textContent = `
            #ripdead-site-down {
                position: fixed;
                inset: 0;
                z-index: 2147483647;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 24px;

                background: #09070f;

                color: #ffffff;

                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }

            .ripdead-down-card {
                width: 100%;
                max-width: 620px;

                text-align: center;
            }

            .ripdead-down-logo {
                width: 76px;
                height: 76px;

                margin: 0 auto 24px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 22px;

                background:
                    linear-gradient(
                        145deg,
                        #7e22ce,
                        #a855f7
                    );

                box-shadow:
                    0 0 35px
                    rgba(168, 85, 247, 0.28);

                font-size: 30px;
                font-weight: 900;
                letter-spacing: -2px;
            }

            .ripdead-down-status {
                display: inline-flex;
                align-items: center;
                gap: 8px;

                margin-bottom: 18px;
                padding: 7px 12px;

                border: 1px solid
                    rgba(168, 85, 247, 0.25);

                border-radius: 999px;

                background:
                    rgba(168, 85, 247, 0.08);

                color: #c084fc;

                font-size: 13px;
                font-weight: 700;
            }

            .ripdead-down-status span {
                width: 7px;
                height: 7px;

                border-radius: 50%;

                background: #c084fc;

                box-shadow:
                    0 0 10px #c084fc;
            }

            .ripdead-down-card h1 {
                margin: 0;

                font-size:
                    clamp(34px, 7vw, 56px);

                line-height: 1.05;
                letter-spacing: -2px;
            }

            .ripdead-down-card p {
                max-width: 520px;

                margin: 20px auto 0;

                color: #aaa4b8;

                font-size: 17px;
                line-height: 1.6;
            }

            .ripdead-down-notice {
                margin: 30px auto 0;
                padding: 18px 20px;

                border: 1px solid
                    rgba(255, 255, 255, 0.08);

                border-radius: 14px;

                background:
                    rgba(255, 255, 255, 0.035);

                color: #d7d2df;

                font-size: 14px;
                line-height: 1.6;
            }

            .ripdead-down-notice strong {
                color: #ffffff;
            }

            .ripdead-down-buttons {
                display: flex;
                justify-content: center;
                gap: 12px;

                margin-top: 28px;
            }

            .ripdead-down-buttons button {
                min-width: 130px;

                padding: 12px 18px;

                border: 0;
                border-radius: 10px;

                background:
                    rgba(255, 255, 255, 0.05);

                color: #ffffff;

                font: inherit;
                font-size: 14px;
                font-weight: 700;

                cursor: pointer;
            }

            #ripdead-down-retry {
                background: #a855f7;
            }

            #ripdead-down-retry:hover {
                background: #9333ea;
            }

            #ripdead-down-home:hover {
                background:
                    rgba(255, 255, 255, 0.1);
            }

            @media (max-width: 520px) {
                .ripdead-down-buttons {
                    flex-direction: column;
                }

                .ripdead-down-buttons button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }

    /* =========================================================
       CHECK SUPABASE
    ========================================================= */

    async function checkSupabase() {
        if (
            checking ||
            siteDownShown ||
            isDownPage()
        ) {
            return;
        }

        checking = true;

        console.log(
            "[Global] Checking Rip_Dead Account..."
        );

        try {
            const controller =
                new AbortController();

            const timeout =
                setTimeout(
                    () => {
                        controller.abort();
                    },
                    5000
                );

            const response =
                await fetch(
                    SUPABASE_URL +
                    "/auth/v1/health",
                    {
                        method: "GET",
                        cache: "no-store",
                        signal:
                            controller.signal
                    }
                );

            clearTimeout(timeout);

            console.log(
                "[Global] Supabase response:",
                response.status
            );

            /*
             * HTTP 5xx means the backend is unavailable.
             */
            if (
                response.status >= 500
            ) {
                console.error(
                    "[Global] Supabase returned a server error."
                );

                showSiteDown();

                return;
            }

            /*
             * 2xx / 3xx / 4xx means the server
             * itself responded.
             *
             * The backend is therefore reachable.
             */
            console.log(
                "[Global] Rip_Dead Account is reachable."
            );

        } catch (error) {
            console.error(
                "[Global] Supabase connection failed:",
                error
            );

            /*
             * This catches:
             *
             * - network failure
             * - DNS failure
             * - timeout
             * - connection failure
             * - paused/unreachable project
             */
            showSiteDown();

        } finally {
            checking = false;
        }
    }

    /* =========================================================
       START
    ========================================================= */

    function start() {
        if (isDownPage()) {
            return;
        }

        /*
         * Give the page a moment to create its DOM.
         */
        if (
            document.readyState ===
            "loading"
        ) {
            document.addEventListener(
                "DOMContentLoaded",
                () => {
                    checkSupabase();
                },
                {
                    once: true
                }
            );
        } else {
            checkSupabase();
        }
    }

    /* =========================================================
       GLOBAL API
    ========================================================= */

    window.RipDeadGlobal = {
        checkSupabase,
        showSiteDown
    };

    start();

})();