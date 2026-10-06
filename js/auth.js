const SUPABASE_URL =
    "https://vcwfgyikbvfzgqiljmry.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_5fJDaLZ4YuN3oHh1XhgE2Q_l5L_g7PZ";

/* =========================================================
   SUPABASE
========================================================= */

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

/* =========================================================
   ERROR HANDLING
========================================================= */

function isSupabaseUnavailableError(error) {
    if (!error) {
        return false;
    }

    const message = String(
        error.message ||
        error.name ||
        error
    ).toLowerCase();

    return (
        error.name === "AuthRetryableFetchError" ||
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network error") ||
        message.includes("fetch failed") ||
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("timed out")
    );
}

function redirectToDownPage() {
    if (
        window.RipDeadGlobal &&
        typeof window.RipDeadGlobal.showSiteDown === "function"
    ) {
        window.RipDeadGlobal.showSiteDown();
        return;
    }

    if (!window.location.pathname.startsWith("/down")) {
        window.location.href = "/down/";
    }
}

function handleSupabaseError(error) {
    console.error("[Auth] Supabase error:", error);

    if (isSupabaseUnavailableError(error)) {
        redirectToDownPage();
        return true;
    }

    return false;
}

/* =========================================================
   SESSION
========================================================= */

async function getSession() {
    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                "[Auth] getSession error:",
                error
            );

            if (handleSupabaseError(error)) {
                return null;
            }

            return null;
        }

        if (data && data.session) {
            console.log(
                "[Auth] Logged in as:",
                data.session.user.email
            );
        } else {
            console.log(
                "[Auth] No active session"
            );
        }

        return data ? data.session : null;

    } catch (error) {
        console.error(
            "[Auth] getSession exception:",
            error
        );

        handleSupabaseError(error);

        return null;
    }
}

/* =========================================================
   DEVICE IDENTIFIER
========================================================= */

/*
 * This is NOT a real hardware ID.
 *
 * Browsers do not provide websites with a reliable physical
 * hardware identifier.
 *
 * This creates a persistent browser/device identifier that
 * the enforce-bans Edge Function hashes before comparing it
 * against ban_records.
 */

function getDeviceIdentifier() {
    const storageKey =
        "ripdead_device_identifier";

    try {
        let identifier =
            localStorage.getItem(
                storageKey
            );

        if (
            identifier &&
            identifier.trim() !== ""
        ) {
            return identifier;
        }

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            identifier =
                window.crypto.randomUUID();
        } else {
            identifier =
                "rd-" +
                Date.now().toString(36) +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 15) +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 15);
        }

        localStorage.setItem(
            storageKey,
            identifier
        );

        return identifier;

    } catch (error) {
        console.warn(
            "[Auth] Could not access localStorage:",
            error
        );

        /*
         * If localStorage is unavailable, create a temporary
         * identifier for this browser session.
         */
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            "rd-temp-" +
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 15)
        );
    }
}

/* =========================================================
   SERVER-SIDE BAN ENFORCEMENT
========================================================= */

async function enforceBans(session = null) {
    try {
        if (!session) {
            session = await getSession();
        }

        if (!session) {
            return {
                banned: false,
                ban_type: null,
                error: null
            };
        }

        /*
         * Never run the enforcement redirect while already
         * on the Declined page.
         */
        if (
            window.location.pathname
                .toLowerCase()
                .startsWith("/declined")
        ) {
            return {
                banned: false,
                ban_type: null,
                error: null
            };
        }

        const deviceIdentifier =
            getDeviceIdentifier();

        console.log(
            "[Auth] Checking server-side bans..."
        );

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "enforce-bans",
                {
                    body: {
                        device_identifier:
                            deviceIdentifier
                    }
                }
            );

        if (error) {
            console.error(
                "[Auth] enforce-bans error:",
                error
            );

            if (handleSupabaseError(error)) {
                return {
                    banned: false,
                    ban_type: null,
                    error
                };
            }

            return {
                banned: false,
                ban_type: null,
                error
            };
        }

        if (
            data &&
            data.banned === true
        ) {
            console.warn(
                "[Auth] Server-side ban detected:",
                data.ban_type
            );

            /*
             * The Edge Function has already marked the
             * profile as banned.
             *
             * Redirect to the Declined page.
             */
            window.location.href =
                "/Declined/";

            return {
                banned: true,
                ban_type:
                    data.ban_type || null,
                error: null
            };
        }

        console.log(
            "[Auth] Server-side ban check passed"
        );

        return {
            banned: false,
            ban_type: null,
            error: null
        };

    } catch (error) {
        console.error(
            "[Auth] enforceBans exception:",
            error
        );

        handleSupabaseError(error);

        return {
            banned: false,
            ban_type: null,
            error
        };
    }
}

/* =========================================================
   BAN CHECK
========================================================= */

async function checkAccountBan(
    session = null
) {
    try {
        if (!session) {
            session = await getSession();
        }

        if (!session) {
            return {
                banned: false,
                profile: null,
                error: null
            };
        }

        /*
         * Never redirect the Declined page back to itself.
         */
        if (
            window.location.pathname
                .toLowerCase()
                .startsWith("/declined")
        ) {
            return {
                banned: false,
                profile: null,
                error: null
            };
        }

        const {
            data: profile,
            error
        } = await supabaseClient
            .from("profiles")
            .select(
                "id,isBanned,ban_type"
            )
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();

        if (error) {
            console.error(
                "[Auth] Ban check error:",
                error
            );

            if (handleSupabaseError(error)) {
                return {
                    banned: false,
                    profile: null,
                    error
                };
            }

            return {
                banned: false,
                profile: null,
                error
            };
        }

        /*
         * No profile means there is nothing to ban.
         */
        if (!profile) {
            return {
                banned: false,
                profile: null,
                error: null
            };
        }

        /*
         * Account is restricted.
         */
        if (profile.isBanned === true) {
            console.warn(
                "[Auth] Account is banned:",
                profile.ban_type
            );

            window.location.href =
                "/Declined/";

            return {
                banned: true,
                profile,
                error: null
            };
        }

        return {
            banned: false,
            profile,
            error: null
        };

    } catch (error) {
        console.error(
            "[Auth] Ban check exception:",
            error
        );

        handleSupabaseError(error);

        return {
            banned: false,
            profile: null,
            error
        };
    }
}

/* =========================================================
   REQUIRE AUTH
========================================================= */

async function requireAuth() {
    const session =
        await getSession();

    if (!session) {
        window.location.href =
            "/login/";

        return null;
    }

    /*
     * First check the IP/device ban through the
     * server-side Edge Function.
     */
    const enforcement =
        await enforceBans(session);

    if (enforcement.banned) {
        return null;
    }

    /*
     * Then check the profile's existing ban state.
     */
    const banStatus =
        await checkAccountBan(session);

    if (banStatus.banned) {
        return null;
    }

    return session;
}

/* =========================================================
   PROFILE
========================================================= */

async function getProfile(userId = null) {
    try {
        const session =
            await getSession();

        if (!session) {
            return null;
        }

        const id =
            userId ||
            session.user.id;

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error(
                "[Auth] getProfile error:",
                error
            );

            if (handleSupabaseError(error)) {
                return null;
            }

            return null;
        }

        return data;

    } catch (error) {
        console.error(
            "[Auth] getProfile exception:",
            error
        );

        handleSupabaseError(error);

        return null;
    }
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

async function updateProfile(updates) {
    try {
        const session =
            await getSession();

        if (!session) {
            return {
                data: null,
                error: new Error(
                    "Not authenticated"
                )
            };
        }

        /*
         * Enforce IP/device bans before allowing profile
         * modifications.
         */
        const enforcement =
            await enforceBans(session);

        if (enforcement.banned) {
            return {
                data: null,
                error: new Error(
                    "Account is restricted"
                )
            };
        }

        /*
         * Do not allow a banned account to update
         * its profile through the normal client.
         */
        const banStatus =
            await checkAccountBan(session);

        if (banStatus.banned) {
            return {
                data: null,
                error: new Error(
                    "Account is restricted"
                )
            };
        }

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .update(updates)
            .eq(
                "id",
                session.user.id
            )
            .select()
            .single();

        if (error) {
            console.error(
                "[Auth] updateProfile error:",
                error
            );

            handleSupabaseError(error);

            return {
                data: null,
                error
            };
        }

        return {
            data,
            error: null
        };

    } catch (error) {
        console.error(
            "[Auth] updateProfile exception:",
            error
        );

        handleSupabaseError(error);

        return {
            data: null,
            error
        };
    }
}

/* =========================================================
   AVATAR HELPERS
========================================================= */

function getAvatarLetter(profile) {
    if (!profile) {
        return "?";
    }

    const name =
        profile.display_name ||
        profile.username ||
        "?";

    return name
        .charAt(0)
        .toUpperCase();
}

function getAvatarUrl(profile) {
    if (
        profile &&
        profile.avatar_url &&
        profile.avatar_url.trim() !== ""
    ) {
        return profile.avatar_url;
    }

    return null;
}

function createAvatar(profile, element) {
    if (!element) {
        return;
    }

    const avatarUrl =
        getAvatarUrl(profile);

    element.innerHTML = "";

    if (avatarUrl) {
        const image =
            document.createElement("img");

        image.src = avatarUrl;

        image.alt =
            profile.display_name ||
            profile.username ||
            "Profile picture";

        image.onerror = () => {
            element.innerHTML = "";

            element.textContent =
                getAvatarLetter(profile);
        };

        element.appendChild(image);

    } else {
        element.textContent =
            getAvatarLetter(profile);
    }
}

/* =========================================================
   MESSAGES
========================================================= */

function setMessage(
    message,
    type = "info"
) {
    const messageElement =
        document.getElementById(
            "message"
        );

    if (!messageElement) {
        console.warn(
            "[Auth] #message element not found:",
            message
        );

        return;
    }

    messageElement.textContent =
        message;

    messageElement.classList.remove(
        "success",
        "error",
        "info",
        "warning"
    );

    messageElement.classList.add(
        type
    );

    messageElement.hidden =
        false;
}

/* =========================================================
   NAVBAR
========================================================= */

async function initNavbar() {
    console.trace(
        "[Auth] initNavbar called"
    );

    const guestElements =
        document.querySelectorAll(
            ".guest-only"
        );

    const authElements =
        document.querySelectorAll(
            ".auth-only"
        );

    const navbarUser =
        document.getElementById(
            "navbar-user"
        );

    const logoutButton =
        document.getElementById(
            "navbar-logout"
        );

    const session =
        await getSession();

    if (session) {

        /*
         * Check server-side IP/device bans first.
         */
        const enforcement =
            await enforceBans(
                session
            );

        if (enforcement.banned) {
            return;
        }

        /*
         * Then check the profile ban.
         */
        const banStatus =
            await checkAccountBan(
                session
            );

        if (banStatus.banned) {
            return;
        }

        console.log(
            "[Auth] Navbar: logged in"
        );

        guestElements.forEach(
            element => {
                element.hidden = true;

                element.style.display =
                    "none";

                element.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        );

        authElements.forEach(
            element => {
                element.hidden = false;

                element.style
                    .removeProperty(
                        "display"
                    );

                element.removeAttribute(
                    "aria-hidden"
                );
            }
        );

        if (navbarUser) {

            const profile =
                await getProfile(
                    session.user.id
                );

            if (profile) {
                navbarUser.textContent =
                    profile.display_name ||
                    profile.username ||
                    session.user.email;
            } else {
                navbarUser.textContent =
                    session.user.email;
            }
        }

        if (logoutButton) {
            logoutButton.onclick =
                signOut;
        }

    } else {

        console.log(
            "[Auth] Navbar: logged out"
        );

        guestElements.forEach(
            element => {
                element.hidden = false;

                element.style
                    .removeProperty(
                        "display"
                    );

                element.removeAttribute(
                    "aria-hidden"
                );
            }
        );

        authElements.forEach(
            element => {
                element.hidden = true;

                element.style.display =
                    "none";

                element.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        );
    }
}

/* =========================================================
   SIGN OUT
========================================================= */

async function signOut() {
    try {
        const {
            error
        } =
            await supabaseClient
                .auth
                .signOut();

        if (error) {
            console.error(
                "[Auth] Sign out error:",
                error
            );

            handleSupabaseError(
                error
            );

            return;
        }

        console.log(
            "[Auth] Signed out"
        );

        window.location.href =
            "/";

    } catch (error) {
        console.error(
            "[Auth] Sign out exception:",
            error
        );

        handleSupabaseError(
            error
        );
    }
}

/* =========================================================
   AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "[Auth] Auth event:",
            event
        );

        if (session) {

            console.log(
                "[Auth] Logged in as:",
                session.user.email
            );

            /*
             * Keep the auth callback lightweight.
             *
             * Ban enforcement is handled explicitly by:
             * - login
             * - signup
             * - requireAuth
             * - initNavbar
             *
             * We only check the existing profile ban here
             * to avoid repeatedly invoking the Edge Function.
             */
            setTimeout(
                async () => {
                    await checkAccountBan(
                        session
                    );
                },
                0
            );

        } else {

            console.log(
                "[Auth] No active session"
            );
        }
    }
);

/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.supabaseClient =
    supabaseClient;

window.getSession =
    getSession;

window.getDeviceIdentifier =
    getDeviceIdentifier;

window.enforceBans =
    enforceBans;

window.requireAuth =
    requireAuth;

window.checkAccountBan =
    checkAccountBan;

window.getProfile =
    getProfile;

window.updateProfile =
    updateProfile;

window.getAvatarLetter =
    getAvatarLetter;

window.getAvatarUrl =
    getAvatarUrl;

window.createAvatar =
    createAvatar;

window.setMessage =
    setMessage;

window.initNavbar =
    initNavbar;

window.signOut =
    signOut;

window.isSupabaseUnavailableError =
    isSupabaseUnavailableError;