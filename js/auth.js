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
            console.error("[Auth] getSession error:", error);

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
            console.log("[Auth] No active session");
        }

        return data ? data.session : null;

    } catch (error) {
        console.error("[Auth] getSession exception:", error);

        handleSupabaseError(error);

        return null;
    }
}

/* =========================================================
   REQUIRE AUTH
========================================================= */

async function requireAuth() {
    const session = await getSession();

    if (!session) {
        window.location.href = "/login/";
        return null;
    }

    return session;
}

/* =========================================================
   PROFILE
========================================================= */

async function getProfile(userId = null) {
    try {
        const session = await getSession();

        if (!session) {
            return null;
        }

        const id = userId || session.user.id;

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("[Auth] getProfile error:", error);

            if (handleSupabaseError(error)) {
                return null;
            }

            return null;
        }

        return data;

    } catch (error) {
        console.error("[Auth] getProfile exception:", error);

        handleSupabaseError(error);

        return null;
    }
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

async function updateProfile(updates) {
    try {
        const session = await getSession();

        if (!session) {
            return {
                data: null,
                error: new Error("Not authenticated")
            };
        }

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .update(updates)
            .eq("id", session.user.id)
            .select()
            .single();

        if (error) {
            console.error("[Auth] updateProfile error:", error);

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

    return name.charAt(0).toUpperCase();
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

    const avatarUrl = getAvatarUrl(profile);

    element.innerHTML = "";

    if (avatarUrl) {
        const image = document.createElement("img");

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

function setMessage(message, type = "info") {
    const messageElement =
        document.getElementById("message");

    if (!messageElement) {
        console.warn(
            "[Auth] #message element not found:",
            message
        );
        return;
    }

    messageElement.textContent = message;

    messageElement.classList.remove(
        "success",
        "error",
        "info",
        "warning"
    );

    messageElement.classList.add(type);

    messageElement.hidden = false;
}

/* =========================================================
   NAVBAR
========================================================= */

async function initNavbar() {
    console.trace("[Auth] initNavbar called");

    const guestElements =
        document.querySelectorAll(".guest-only");

    const authElements =
        document.querySelectorAll(".auth-only");

    const navbarUser =
        document.getElementById("navbar-user");

    const logoutButton =
        document.getElementById("navbar-logout");

    const session = await getSession();

    if (session) {
        console.log(
            "[Auth] Navbar: logged in"
        );

        guestElements.forEach(element => {
            element.hidden = true;
            element.style.display = "none";
            element.setAttribute(
                "aria-hidden",
                "true"
            );
        });

        authElements.forEach(element => {
            element.hidden = false;
            element.style.removeProperty("display");
            element.removeAttribute("aria-hidden");
        });

        if (navbarUser) {
            const profile =
                await getProfile(session.user.id);

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
            logoutButton.onclick = signOut;
        }

    } else {
        console.log(
            "[Auth] Navbar: logged out"
        );

        guestElements.forEach(element => {
            element.hidden = false;
            element.style.removeProperty("display");
            element.removeAttribute("aria-hidden");
        });

        authElements.forEach(element => {
            element.hidden = true;
            element.style.display = "none";
            element.setAttribute(
                "aria-hidden",
                "true"
            );
        });
    }
}

/* =========================================================
   SIGN OUT
========================================================= */

async function signOut() {
    try {
        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {
            console.error(
                "[Auth] Sign out error:",
                error
            );

            handleSupabaseError(error);

            return;
        }

        console.log(
            "[Auth] Signed out"
        );

        window.location.href = "/";

    } catch (error) {
        console.error(
            "[Auth] Sign out exception:",
            error
        );

        handleSupabaseError(error);
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

window.requireAuth =
    requireAuth;

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