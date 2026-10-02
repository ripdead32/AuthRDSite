const SUPABASE_URL = "https://vcwfgyiksadbdsadsahjdsahgdsauge21iytiy21t2712212ce21goon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5fJDaLZ4YuN3oHh1XhgE2Q_l5L_g7PZ";

/* =========================================================
   SUPABASE
========================================================= */

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

/* =========================================================
   SITE DOWN DETECTION
========================================================= */

function isSupabaseUnavailableError(error) {
    if (!error) {
        return false;
    }

    const name =
        String(error.name || "").toLowerCase();

    const message =
        String(error.message || "").toLowerCase();

    /*
     * Supabase Auth uses this error for retryable
     * network/fetch failures.
     */
    if (name === "authretryablefetcherror") {
        return true;
    }

    /*
     * Browser/network failure messages.
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

    return networkErrors.some(text =>
        message.includes(text)
    );
}

function redirectToDownPage() {
    /*
     * Prevent an infinite redirect loop if the down page
     * itself happens to load auth.js.
     */
    if (
        window.location.pathname === "/down/" ||
        window.location.pathname === "/down/index.html"
    ) {
        return;
    }

    window.location.href = "/down/";
}

function handleSupabaseError(error) {
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
                "Session error:",
                error
            );

            handleSupabaseError(error);

            return null;
        }

        return data.session || null;

    } catch (error) {
        console.error(
            "Session request failed:",
            error
        );

        handleSupabaseError(error);

        return null;
    }
}

/* =========================================================
   AUTH GUARD
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
    const session = await getSession();

    const id =
        userId ||
        session?.user?.id;

    if (!id) {
        return null;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error(
                "Profile error:",
                error
            );

            handleSupabaseError(error);

            return null;
        }

        return data;

    } catch (error) {
        console.error(
            "Profile request failed:",
            error
        );

        handleSupabaseError(error);

        return null;
    }
}

async function updateProfile(updates) {
    const session = await getSession();

    if (!session) {
        return {
            success: false,
            error: "You are not logged in."
        };
    }

    try {
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
            console.error(
                "Update profile error:",
                error
            );

            handleSupabaseError(error);

            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            profile: data
        };

    } catch (error) {
        console.error(
            "Update profile request failed:",
            error
        );

        handleSupabaseError(error);

        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error"
        };
    }
}

/* =========================================================
   AVATAR
========================================================= */

function getAvatarLetter() {
    // No random fallback letters.
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
    const wrapper =
        document.createElement("div");

    wrapper.className =
        className || "account-avatar";

    wrapper.classList.add("empty");

    wrapper.style.overflow = "hidden";
    wrapper.style.borderRadius = "50%";

    const avatarUrl =
        getAvatarUrl(profile);

    if (avatarUrl) {
        const image =
            document.createElement("img");

        image.src = avatarUrl;
        image.alt = "";

        image.style.display = "block";
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.maxWidth = "100%";
        image.style.maxHeight = "100%";
        image.style.objectFit = "cover";
        image.style.objectPosition = "center";
        image.style.borderRadius = "50%";

        image.addEventListener(
            "error",
            () => {
                image.remove();
            }
        );

        wrapper.appendChild(image);
    }

    return wrapper;
}

/* =========================================================
   MESSAGES
========================================================= */

function setMessage(
    elementOrId,
    message,
    type = ""
) {
    const element =
        typeof elementOrId === "string"
            ? document.getElementById(
                elementOrId
            )
            : elementOrId;

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        "message";

    if (type) {
        element.classList.add(type);
    }
}

/* =========================================================
   NAVBAR
========================================================= */

async function initNavbar() {
    console.log(
        "[Auth] Initializing navbar..."
    );

    const session =
        await getSession();

    console.log(
        "[Auth] Navbar session:",
        session
            ? "LOGGED IN"
            : "LOGGED OUT"
    );

    /* ---------------------------------------------------------
       GUEST ELEMENTS
       Log In / Create Account
    --------------------------------------------------------- */

    const guestElements =
        document.querySelectorAll(
            ".guest-only"
        );

    /* ---------------------------------------------------------
       AUTH ELEMENTS
       Search / Friends / Settings / Account / Log Out
    --------------------------------------------------------- */

    const authElements =
        document.querySelectorAll(
            ".auth-only"
        );

    if (session) {
        console.log(
            "[Auth] Showing authenticated navbar."
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

                element.style.removeProperty(
                    "display"
                );

                element.removeAttribute(
                    "aria-hidden"
                );
            }
        );

    } else {
        console.log(
            "[Auth] Showing guest navbar."
        );

        guestElements.forEach(
            element => {
                element.hidden = false;

                element.style.removeProperty(
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

    /* =========================================================
       NAVBAR USER
    ========================================================= */

    const navbarUser =
        document.getElementById(
            "navbar-user"
        );

    if (navbarUser) {
        navbarUser.innerHTML = "";

        if (session) {
            const profile =
                await getProfile(
                    session.user.id
                );

            if (profile) {
                const avatar =
                    createAvatar(
                        profile,
                        "navbar-avatar"
                    );

                avatar.style.width =
                    "28px";

                avatar.style.height =
                    "28px";

                avatar.style.minWidth =
                    "28px";

                avatar.style.minHeight =
                    "28px";

                avatar.style.flex =
                    "0 0 28px";

                const name =
                    document.createElement(
                        "span"
                    );

                name.textContent =
                    profile.display_name ||
                    profile.username ||
                    "Account";

                navbarUser.appendChild(
                    avatar
                );

                navbarUser.appendChild(
                    name
                );

            } else {
                navbarUser.textContent =
                    "Account";
            }
        }
    }

    /* =========================================================
       LOGOUT BUTTON
    ========================================================= */

    const logoutButton =
        document.getElementById(
            "navbar-logout"
        );

    if (logoutButton) {
        logoutButton.onclick =
            async () => {

                if (logoutButton.disabled) {
                    return;
                }

                logoutButton.disabled =
                    true;

                logoutButton.textContent =
                    "Logging out...";

                const success =
                    await signOut();

                if (!success) {
                    logoutButton.disabled =
                        false;

                    logoutButton.textContent =
                        "Log Out";
                }
            };
    }

    return session;
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
                "Sign out error:",
                error
            );

            handleSupabaseError(error);

            return false;
        }

        window.location.href =
            "/login/";

        return true;

    } catch (error) {
        console.error(
            "Sign out request failed:",
            error
        );

        handleSupabaseError(error);

        return false;
    }
}

/* =========================================================
   AUTH STATE LISTENER
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
                "[Auth] No active session."
            );
        }

        /*
         * Do NOT automatically redirect here.
         *
         * Individual pages decide what they should do.
         */
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