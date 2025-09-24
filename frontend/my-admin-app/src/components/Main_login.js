// A module-level boolean tracking if we've already attached listeners
// let signupFormListenerAttached = false;
let signinFormListenerAttached = false;

export async function MainLogin (navigate) {
// import './style.css'

    const API_URL = "http://localhost:8080/users/tokens";

    let access_token;
    let refresh_token = localStorage.getItem("refresh_token");
    let resource_owner;

    // const signupForm = document.querySelector("#sign_up_form");
    const signinForm = document.querySelector("#sign_in_form");
    const emailError = document.querySelector("#emailError");



    if (!signinFormListenerAttached) {
        signinFormListenerAttached = true;
        signinForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            // ... your sign-in logic
            //sign-in
            const email = document.querySelector("#signin-email").value;
            const password = document.querySelector("#signin-password").value;
        
            const response = await fetch(`${API_URL}/admin-sign_in`, {
                method: "POST",
                body: JSON.stringify({
                email,
                password,
                }),
                headers: { "Content-Type": "application/json" },
            });
        
            if (!response.ok) {
                // parse the JSON payload
                const { error } = await response.json();
                alert(error || "An unexpected error occurred.");
                return;
              }
        
            //store token in local
            await handleAuthResponse(response);
            userSession();
            navigate("/");
            });
    }


    function validatePassword(password1, password2, passwordError) {

        // Define password criteria using regular expressions
        var passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

        // Test the password against the pattern
        if (passwordPattern.test(password1) && passwordPattern.test(password2)) {
            // Password is valid
            passwordError.textContent = '';
            // alert('Password is valid!');
            return true;
        } else if (password1 !== password2) { 
            passwordError.textContent = 'Passwords do not match!';
            return false;
        } else {
            // Password is invalid
            passwordError.textContent = 'Password must contain at least 8 characters, including at least one digit, one lowercase letter, and one uppercase letter.';
            return false;
        }
    }

    function validateEmail(email) {
        // Define the pattern of an email
        var emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (emailPattern.test(email)) {
            emailError.textContent = '';
            return true;
        } else {
            emailError.textContent = 'Not a valid form for an email'
            return false;
        }
    }

    async function handleAuthResponse(response) {
        const data = await response.json();
        console.log("Parsed response:", data); // Debug log
        localStorage.setItem("resource_owner", JSON.stringify(data.resource_owner));
        console.log(localStorage.getItem("resource_owner"));
        localStorage.setItem("refresh_token", data.refresh_token);
        access_token = data.token;
        refresh_token = data.refresh_token;
        resource_owner = data.resource_owner;
    }

    async function refreshToken() {
        refresh_token = localStorage.getItem("refresh_token");
        if (nullOrUndefined(refresh_token)) {
            return;
        }
        console.log(refresh_token);

        try {
            let response = await fetch(`${API_URL}/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${refresh_token}`,
            },
            });
            if(!response.ok) {
            if(response.status === 401) {
                //redirect to login page or handle error otherwise
            } else {
                throw new Error(response.statusText)
            }
            }
            let data = await response.json();
            console.log("Setting access token to: ", data.token);
            localStorage.setItem("resource_owner", JSON.stringify(data.resource_owner));
            localStorage.setItem("refresh_token", data.refresh_token);
            access_token = data.token;
            refresh_token = data.refresh_token;
            resource_owner = data.resource_owner;
        } catch (err) {
            console.log("Error refreshing token: ", err);
            resetTokens();
            //show sign in page again
            userSession();
        }
    }

    function nullOrUndefined(item) {
    return item == null || item === "undefined";
    }

    async function userSession() {
        await refreshToken();
        await requestNewAccessToken();

        window.access_token = access_token;
        if (nullOrUndefined(access_token)) {
            document.querySelector("#sign_in_form").style.display = "block";
            document.querySelector("#Back").style.display = "none";
            document.querySelector("#sign_out").style.display = "none";

        } else {
            document.querySelector("#sign_in_form").style.display = "none";
            document.querySelector("#forgot_password").style.display = "none";
            document.querySelector("#Back").style.display = "none";
            document.querySelector("#sign_out").style.display = "inline-block";
            
        }
        getUser();
    }

    function getUser() {
        let stored_resource = localStorage.getItem("resource_owner");
        if(nullOrUndefined(stored_resource)) {
            toggleUserDiv();
            return;
        }
        resource_owner = JSON.parse(stored_resource);
        toggleUserDiv();
    }

    function resetTokens() {
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("resource_owner");
        access_token = null;
        refresh_token = null;
        resource_owner = null;
    }

    async function requestNewAccessToken() {
    if (nullOrUndefined(refresh_token)) {
        return;
    }
    if (access_token) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refresh_token}`,
        },
        });
        handleAuthResponse(response);
    } catch(err) {
        console.log("Error refreshing token: ", err);
        resetTokens();
        userSession();
    }
    }

    async function userCanAccess() {
    if (nullOrUndefined(access_token)) {
        return;
    }
    const response = await fetch(`http://localhost:3000/pages/restricted`, {
        method: "GET",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        },
    });
    const data = await response.json();

    console.log("%c" + data.message, "color: green");
    if (data.error) {
        console.log("Error: ", data.error);
        resetTokens()
        userSession();
    }
    }

    await userSession().then(() => {
    console.log(
        "%cUser session complete. Begin application logic",
        "color: purple"
    );
    if (resource_owner) {
        userCanAccess();
    } else {
        console.log("No user");
    }
    });

    const FPFormButton = document.querySelector("#forgot_password");
    FPFormButton.addEventListener("click", async (e) => {
        e.preventDefault();
        document.querySelector("#forgotPasswordForm").style.display = "block";
        document.querySelector("#Back").style.display = "inline-block";
        FPFormButton.style.display = "none";
    });

    const BackButton = document.querySelector("#Back");
    BackButton.addEventListener("click", async (e) => {
        e.preventDefault();
        document.querySelector("#forgotPasswordForm").style.display = "none";
        FPFormButton.style.display = "inline-block";
        BackButton.style.display ="none";
        emailError.textContent = '';
    });

    const BackButton2 = document.querySelector("#Back2");
    BackButton2.addEventListener("click", async (e) => {
        e.preventDefault();
        document.querySelector("#forgotPasswordForm").style.display = "none";
        document.querySelector("#ResetPasswordForm").style.display = "none";
        FPFormButton.style.display = "inline-block";
        BackButton2.style.display ="none";
        emailError.textContent = '';
    });


    const SendTokButton = document.querySelector("#Send_Reset_Token");
    SendTokButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#Forgot_Pass_email").value;
    if (validateEmail(email)) {
        //send token email here
        fetch('http://localhost:3000/passwords/forgot', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email }),
    })
    .then(response => {
        if (response.ok) {
        console.log('Password reset request successful');
        } else {
        console.error(`Error in password reset request. Status: ${response.status}, ${response.statusText}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
        document.querySelector("#ResetPasswordForm").style.display = "block";
        document.querySelector("#forgotPasswordForm").style.display = "none";
        document.querySelector("#passwordError2").textContent = '';
        BackButton.style.display ="none";
        BackButton2.style.display ="inline-block";
    } else {
        return
    }

    });

    const resetPassButton = document.querySelector("#Reset_Password_Button");
    resetPassButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const password = document.querySelector("#New_Password").value;
    const resetToken = document.querySelector("#resetToken").value;
    const password_confirm = document.querySelector(
        "#New_Password_confirm"
        ).value;
        var passwordError = document.getElementById('passwordError2');
        if(validatePassword(password, password_confirm, passwordError)){
        //update password logic goes here
        fetch('http://localhost:3000/passwords/reset', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
            password: password,
            token: resetToken
            }),
        });
        const resetPassForm = document.querySelector("#ResetPasswordForm");
        resetPassForm.style.display="none";
        } else {
        return;
        }
    });

    const signoutButton = document.querySelector("#sign_out");
    signoutButton.addEventListener("click", async (e) => {
        e.preventDefault();
        document.querySelector("#forgot_password").style.display = "inline-block";
        console.log("Logging out");
        resetTokens();
        userSession();
    });

    function toggleUserDiv() {
        const user = document.querySelector("#user");
        if (resource_owner) { 
            user.innerHTML = resource_owner.email;
            user.style.display = "block";
        } else {
            user.innerHTML = "";
            user.style.display = "none";
        }
    }



}
