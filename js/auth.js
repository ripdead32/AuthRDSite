const SUPABASE_URL = "https://vcwfgyikbvfzgqiljmry.supabase.co";
const SUPABASE_KEY = "sb_publishable_5fJDaLZ4YuN3oHh1XhgE2Q_l5L_g7PZ";

if (!window.supabase) {
    throw new Error("Supabase JavaScript library failed to load.");
}

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

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
        window.location.href = "../login/";
        return null;
    }

    return session;
}

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

window.supabaseClient.auth.onAuthStateChange(
    (event, session) => {
        console.log("Auth event:", event);

        if (session) {
            console.log("Logged in as:", session.user.email);
        } else {
            console.log("No active session.");
        }
    }
);