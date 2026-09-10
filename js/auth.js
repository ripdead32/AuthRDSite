const SUPABASE_URL = "https://vcwfgyikbvfzgqiljmry.supabase.co";
const SUPABASE_KEY = "sb_publishable_5fJDaLZ4YuN3oHh1XhgE2Q_l5L_g7PZ";

if (!window.supabase) {
    throw new Error("Supabase JavaScript library failed to load.");
}

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =========================
   AUTH
========================= */

async function getSession() {
    const { data, error } =
        await window.supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        return null;
    }

    return data.session;
}


async function requireAuth() {
    const session = await getSession();

    if (!session) {
        const currentPath =
            window.location.pathname +
            window.location.search;

        window.location.href =
            "../login/?redirect=" +
            encodeURIComponent(currentPath);

        return null;
    }

    return session;
}


async function signOut() {
    const { error } =
        await window.supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        return false;
    }

    window.location.href = "../login/";
    return true;
}


/* =========================
   PROFILES
========================= */

async function getProfile(userId = null) {
    const session = await getSession();

    if (!session) {
        return null;
    }

    const id = userId || session.user.id;

    const { data, error } =
        await window.supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single();

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
            data: null,
            error: new Error("You are not logged in.")
        };
    }

    const { data, error } =
        await window.supabaseClient
            .from("profiles")
            .update(updates)
            .eq("id", session.user.id)
            .select()
            .single();

    if (error) {
        console.error("Profile update error:", error);
    }

    return {
        data,
        error
    };
}


/* =========================
   AVATARS
========================= */

function getAvatarLetter(profile) {
    const name =
        profile?.display_name ||
        profile?.username ||
        "?";

    return name.charAt(0).toUpperCase();
}


function getAvatarUrl(profile) {
    return profile?.avatar_url || null;
}


function createAvatar(profile, className = "avatar") {
    const wrapper =
        document.createElement("div");

    wrapper.className = className;

    const avatarUrl =
        getAvatarUrl(profile);

    if (avatarUrl) {
        const image =
            document.createElement("img");

        image.src = avatarUrl;
        image.alt = "";

        wrapper.appendChild(image);
    } else {
        wrapper.textContent =
            getAvatarLetter(profile);
    }

    return wrapper;
}


/* =========================
   MESSAGES
========================= */

function setMessage(element, text, type = "") {
    if (!element) {
        return;
    }

    element.textContent = text;

    element.className =
        type
            ? "auth-message " + type
            : "auth-message";
}


/* =========================
   NAVBAR
========================= */

async function initNavbar() {
    const session = await getSession();

    const guestElements =
        document.querySelectorAll(".guest-only");

    const authElements =
        document.querySelectorAll(".auth-only");

    guestElements.forEach((element) => {
        element.hidden = !!session;
    });

    authElements.forEach((element) => {
        element.hidden = !session;
    });


    /* Navbar account */

    const navbarUser =
        document.getElementById("navbar-user");

    if (navbarUser) {
        navbarUser.innerHTML = "";

        if (session) {
            const profile =
                await getProfile(session.user.id);

            if (profile) {
                const avatar =
                    createAvatar(
                        profile,
                        "navbar-avatar"
                    );

                const name =
                    document.createElement("span");

                name.textContent =
                    profile.display_name ||
                    profile.username ||
                    "Account";

                navbarUser.appendChild(avatar);
                navbarUser.appendChild(name);
            } else {
                navbarUser.textContent =
                    session.user.email;
            }
        }
    }


    /* Navbar logout */

    const logoutButton =
        document.getElementById("navbar-logout");

    if (logoutButton) {
        logoutButton.onclick = async () => {
            if (logoutButton.disabled) {
                return;
            }

            logoutButton.disabled = true;
            logoutButton.textContent =
                "Logging out...";

            const success =
                await signOut();

            if (!success) {
                logoutButton.disabled = false;
                logoutButton.textContent =
                    "Log Out";
            }
        };
    }

    return session;
}


/* =========================
   AUTH STATE
========================= */

window.supabaseClient.auth.onAuthStateChange(
    (event, session) => {
        console.log(
            "Auth event:",
            event
        );

        if (session) {
            console.log(
                "Logged in as:",
                session.user.email
            );
        }
    }
);


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.getSession = getSession;
window.requireAuth = requireAuth;

window.getProfile = getProfile;
window.updateProfile = updateProfile;

window.signOut = signOut;

window.getAvatarLetter = getAvatarLetter;
window.getAvatarUrl = getAvatarUrl;
window.createAvatar = createAvatar;

window.setMessage = setMessage;

window.initNavbar = initNavbar;