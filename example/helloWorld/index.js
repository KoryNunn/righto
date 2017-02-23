// This is a simple non-runnable example of how righto can be used.

function createAccount(email, callback){
    db.Accounts.create(
        {
            email: email
        },
        callback
    );
}

function createUser(userData, account, callback){
    db.Users.create(
        {
            ...userData,
            accountId: account.id
        },
        callback
    );
}
function createPet(userId, petData, callback){
    db.Pets.create(
        {
            ...petData,
            userId: userId
        },
        callback
    );
}

function createNewUser(userData, callback){

    var account = righto(createAccount, userData.email); // righto -> error, account.

    var user = righto(createUser, userData, account); // righto -> error, user.

    var pets = righto.all(userData.pets.map(petData =>
            righto(createPet, user.get('id'), petData);
        ));

    var done = righto.mate(user, righto.after(pets));  // righto -> error, account. (IGNORED [pet...])

    done(callback);
}