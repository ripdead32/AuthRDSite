const SUPABASE_URL =
    "https://vcwfgyikbvfzgqiljmry.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_5fJDaLZ4YuN3oHh1XhgE2Q_l5L_g7PZ";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


// ============================================================
// SUPABASE ERROR / SITE DOWN
// ============================================================

function isSupabaseUnavailableError(error) {
    if (!error) {
        return false;
    }

    if (error.name === "AuthRetryableFetchError") {
        return true;
    }

    const message = String(error.message || "").toLowerCase();

    return (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network error") ||
        message.includes("fetch failed") ||
        message.includes("connection refused") ||
        message.includes("timeout")
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
    if (isSupabaseUnavailableError(error)) {
        console.error("[Auth] Supabase unavailable:", error);
        redirectToDownPage();
        return true;
    }

    return false;
}


// ============================================================
// SESSION
// ============================================================

async function getSession() {
    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            handleSupabaseError(error);
            return null;
        }

        return data.session;
    } catch (error) {
        handleSupabaseError(error);
        return null;
    }
}


async function requireAuth() {
    const session = await getSession();

    if (!session) {
        window.location.href = "/login/";
        return null;
    }

    return session;
}


// ============================================================
// PROFILE
// ============================================================

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
            handleSupabaseError(error);

            console.error(
                "[Auth] Failed to get profile:",
                error
            );

            return null;
        }

        return data;
    } catch (error) {
        handleSupabaseError(error);
        return null;
    }
}


async function updateProfile(updates) {
    try {
        const session = await getSession();

        if (!session) {
            return {
                success: false,
                error: "Not logged in."
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
            handleSupabaseError(error);

            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            data
        };
    } catch (error) {
        handleSupabaseError(error);

        return {
            success: false,
            error: error.message
        };
    }
}


// ============================================================
// AVATAR
// ============================================================

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
    if (!profile || !profile.avatar_url) {
        return null;
    }

    return profile.avatar_url;
}


function createAvatar(element, profile) {
    if (!element) {
        return;
    }

    const avatarUrl = getAvatarUrl(profile);

    if (avatarUrl) {
        element.style.backgroundImage =
            `url("${avatarUrl}")`;

        element.style.backgroundSize = "cover";
        element.style.backgroundPosition = "center";
        element.textContent = "";
        return;
    }

    element.style.backgroundImage = "";
    element.textContent = getAvatarLetter(profile);
}


// ============================================================
// MESSAGE
// ============================================================

function setMessage(element, message, type = "info") {
    if (!element) {
        return;
    }

    element.textContent = message;

    element.classList.remove(
        "success",
        "error",
        "info"
    );

    element.classList.add(type);
}


// ============================================================
// NAVBAR
// ============================================================

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
            "[Auth] Navbar: logged in as",
            session.user.email
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


        if (
            logoutButton &&
            !logoutButton.dataset.authBound
        ) {
            logoutButton.dataset.authBound = "true";

            logoutButton.addEventListener(
                "click",
                signOut
            );
        }

    } else {
        console.log("[Auth] Navbar: logged out");

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


// ============================================================
// SIGN OUT
// ============================================================

async function signOut() {
    try {
        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {
            handleSupabaseError(error);

            console.error(
                "[Auth] Sign out failed:",
                error
            );

            return;
        }

        window.location.href = "/";
    } catch (error) {
        handleSupabaseError(error);
    }
}


// ============================================================
// AUTH STATE
// ============================================================

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
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


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.supabaseClient = supabaseClient;

window.getSession = getSession;
window.requireAuth = requireAuth;

window.getProfile = getProfile;
window.updateProfile = updateProfile;

window.getAvatarLetter = getAvatarLetter;
window.getAvatarUrl = getAvatarUrl;
window.createAvatar = createAvatar;

window.setMessage = setMessage;

window.initNavbar = initNavbar;
window.signOut = signOut;

window.isSupabaseUnavailableError =
    isSupabaseUnavailableError;