import * as admin from "firebase-admin";
import * as serviceAccount from "../serviceAccountKey.json";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any)
});

async function debugStudents() {
    const db = admin.firestore();

    // Test 1: Tüm students'ı say
    const allSnap = await db.collection("students").limit(10).get();
    console.log("📊 Toplam student sayısı (ilk 10):", allSnap.size);

    // Test 2: İlk student'ın data structure'ını göster
    if (!allSnap.empty) {
        const first = allSnap.docs[0];
        const data = first.data();
        console.log("\n📄 İlk student'ın tüm field'ları:");
        console.log(JSON.stringify(Object.keys(data), null, 2));

        console.log("\n🔍 Nested yapılar:");
        if (data.parq) console.log("parq:", Object.keys(data.parq));
        if (data.health) console.log("health:", Object.keys(data.health));
        if (data.parqAnswers) console.log("parqAnswers:", Object.keys(data.parqAnswers));

        // Test 3: doctorSaidHeartOrHypertension field'ını kontrol et
        console.log("\n❤️ Kalp field kontrolü:");
        console.log("Flat field:", data.doctorSaidHeartOrHypertension);
        console.log("parq.doctorSaidHeartOrHypertension:", data.parq?.doctorSaidHeartOrHypertension);
        console.log("parqAnswers.doctorSaidHeartOrHypertension:", data.parqAnswers?.doctorSaidHeartOrHypertension);
    }

    // Test 4: true olan kayıt var mı?
    console.log("\n🔎 doctorSaidHeartOrHypertension = true sorgusu:");
    try {
        const heartSnap = await db.collection("students")
            .where("doctorSaidHeartOrHypertension", "==", true)
            .limit(5)
            .get();
        console.log("Bulunan:", heartSnap.size);

        heartSnap.docs.forEach(d => {
            console.log("- ID:", d.id, "Name:", d.data().name);
        });
    } catch (err: any) {
        console.log("❌ Query hatası:", err.message);
    }

    // Test 5: users/{uid}/students deneme (UID lazım)
    console.log("\n👤 Users collection kontrolü:");
    const usersSnap = await db.collection("users").limit(1).get();
    if (!usersSnap.empty) {
        const uid = usersSnap.docs[0].id;
        console.log("Test UID:", uid);

        const userStudents = await db.collection("users").doc(uid).collection("students").limit(5).get();
        console.log("Bu user'ın student sayısı:", userStudents.size);

        if (!userStudents.empty) {
            const first = userStudents.docs[0].data();
            console.log("İlk student field'ları:", Object.keys(first));
            console.log("doctorSaidHeartOrHypertension:", first.doctorSaidHeartOrHypertension);
        }
    }
}

debugStudents()
    .then(() => {
        console.log("\n✅ Debug tamamlandı");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Hata:", err);
        process.exit(1);
    });

async function fieldDistribution() {
    console.log("\n🔢 Field değer dağılımı:");

    const db = admin.firestore();
    const snap = await db.collection("users").doc("53UjzlXF0VbAt5OQsNrn5sjWA4x1").collection("students").get();

    let trueCount = 0;
    let falseCount = 0;
    let nullCount = 0;

    snap.docs.forEach(d => {
        const val = d.data().doctorSaidHeartOrHypertension;
        if (val === true) trueCount++;
        else if (val === false) falseCount++;
        else nullCount++;
    });

    console.log("true:", trueCount);
    console.log("false:", falseCount);
    console.log("null/undefined:", nullCount);
}

fieldDistribution().catch(err => {
    console.error("❌ Field dağılımı hatası:", err);
});
// Test the actual query
async function testActualQuery() {
    console.log("\n🔎 Gerçek query testi:");
    const db = admin.firestore();
    const testUid = "53UjzlXF0VbAt5OQsNrn5sjWA4x1";

    const queryResult = await db
        .collection("users")
        .doc(testUid)
        .collection("students")
        .where("doctorSaidHeartOrHypertension", "==", true)
        .limit(10)
        .get();

    console.log("Query buldu:", queryResult.size);
    queryResult.docs.forEach(d => {
        console.log("- ID:", d.id, "Name:", d.data().name);
    });
}

testActualQuery().catch(err => {
    console.error("❌ Gerçek query hatası:", err);
});