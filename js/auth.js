const SUPABASE_URL = "https://vcwfgyikbvfzgqiljmry.supabase.co";

/*
 * Keep your existing Supabase publishable key here.
 * Do NOT replace it with a service-role key.
 */
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5fJDaLZ4YuN3oHh1XhgE2Q_l5L_g7PZ";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================
   SESSION
========================= */

async function getSession() {
    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        return null;
    }

    return data.session || null;
}


/* =========================
   AUTH GUARD
========================= */

async function requireAuth() {
    const session = await getSession();

    if (!session) {
        window.location.href = "/login/";
        return null;
    }

    return session;
}


/* =========================
   PROFILE
========================= */

async function getProfile(userId = null) {
    const session = await getSession();

    const id = userId || session?.user?.id;

    if (!id) {
        return null;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Profile error:", error);
        return null;
    }

    return data;
}


async function updateProfile(updates) {
    const session = await getSession();

    if (!session) {
        return {
            success: false,
            error: "You are not logged in."
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
        console.error("Update profile error:", error);

        return {
            success: false,
            error: error.message
        };
    }

    return {
        success: true,
        profile: data
    };
}


/* =========================
   AVATAR
========================= */

function getAvatarLetter() {
    /*
     * Intentionally disabled.
     *
     * We no longer randomly display "R", "A", etc.
     */
    return "";
}


function getAvatarUrl(profile) {
    if (!profile) {
        return null;
    }

    if (
        typeof profile.avatar_url === "string" &&
        profile.avatar_url.trim() !== ""
    ) {
        return profile.avatar_url;
    }

    return null;
}


function createAvatar(profile, className = "") {
    const wrapper = document.createElement("div");

    wrapper.className = `account-avatar empty ${className}`.trim();

    const avatarUrl = getAvatarUrl(profile);

    if (avatarUrl) {
        const image = document.createElement("img");

        image.src = avatarUrl;
        image.alt = "";

        image.addEventListener("error", () => {
            image.remove();
        });

        wrapper.appendChild(image);
    }

    return wrapper;
}


/* =========================
   MESSAGES
========================= */

function setMessage(elementOrId, message, type = "") {
    const element =
        typeof elementOrId === "string"
            ? document.getElementById(elementOrId)
            : elementOrId;

    if (!element) {
        return;
    }

    element.textContent = message || "";
    element.className = "message";

    if (type) {
        element.classList.add(type);
    }
}


/* =========================
   NAVBAR
========================= */

async function initNavbar() {
    const session = await getSession();

    /*
     * This is the ONLY place controlling navbar auth visibility.
     */

    document.querySelectorAll(".guest-only").forEach(element => {
        element.hidden = Boolean(session);
    });

    document.querySelectorAll(".auth-only").forEach(element => {
        element.hidden = !session;
    });


    /*
     * Optional navbar user display.
     */
    const navbarUser = document.getElementById("navbar-user");

    if (navbarUser) {
        navbarUser.innerHTML = "";

        if (session) {
            const profile = await getProfile(session.user.id);

            if (profile) {
                const avatar = createAvatar(
                    profile,
                    "navbar-avatar"
                );

                avatar.style.width = "28px";
                avatar.style.height = "28px";
                avatar.style.flex = "0 0 28px";

                const name = document.createElement("span");

                name.textContent =
                    profile.display_name ||
                    profile.username ||
                    "Account";

                navbarUser.appendChild(avatar);
                navbarUser.appendChild(name);
            }
        }
    }


    /*
     * Logout
     */
    const logoutButton =
        document.getElementById("navbar-logout");

    if (logoutButton) {
        logoutButton.onclick = async () => {
            if (logoutButton.disabled) {
                return;
            }

            logoutButton.disabled = true;
            logoutButton.textContent = "Logging out...";

            const success = await signOut();

            if (!success) {
                logoutButton.disabled = false;
                logoutButton.textContent = "Log Out";
            }
        };
    }

    return session;
}


/* =========================
   SIGN OUT
========================= */

async function signOut() {
    const {
        error
    } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Sign out error:", error);
        return false;
    }

    window.location.href = "/login/";

    return true;
}


/* =========================
   AUTH LISTENER
========================= */

supabaseClient.auth.onAuthStateChange(
    (event, session) => {
        console.log("Auth event:", event);

        if (session) {
            console.log(
                "Logged in as:",
                session.user.email
            );
        }
    }
);


/* =========================
   GLOBAL EXPORTS
========================= */

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