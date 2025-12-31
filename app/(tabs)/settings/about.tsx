import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ACCENT_COLOR } from "../../../src/theme";

export default function AboutScreen() {
  const { colors, dark: isDark } = useTheme();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const termsUrl =
    "https://docs.google.com/document/d/e/2PACX-1vS3HysRRoUx8PQHZOfmlB53dVtR3N_fgZVZyffwu7Z1xpNSTBjVa0-gAZre--ZRFinD3HW4CWw9sM3F/pub";
  const privacyUrl =
    "https://docs.google.com/document/d/e/2PACX-1vRofzPRbnlf0IeXpO72xloSU52A8dSqs-gBpSMSrGv5K0tYiLAyIxJF2ILN0-dBmXzfSuFkMRNiuyy2/pub";

  const mainDirectoryRows = [
    [
      "CITY BIBLE CHURCH MAIN LEADERSHIP AND ADMINISTRATION DIRECTORY",
      "",
      "",
      "",
    ],
    ["Designation", "Name", "Contact Number", "Email Address"],
    ["BOARD OF ELDERS", "", "", ""],
    ["SENIOR PASTOR", "PTR. JAIME GUSTILO", "0917-1747797", "jimirichbg@yahoo.com"],
    ["ASSOCIATE PASTOR", "ELD. HARRY SINGSON", "0923-3505754", "harcalson@yahoo.com"],
    ["ASSOCIATE PASTOR", "PTR. ROLDAN ORTEGA", "0951-9993012", "danortega072884@gmail.com"],
    ["", "ELD. RENATO GARCIA", "0995-5584930", "renatocandaregarcia@gmail.com"],
    ["", "ELD. ENRIQUE PEREZ", "0943-8555970", "ep69654@gmail.com"],
    ["", "ELD. DENNIS CARMELINA", "0991-3108889/0915-7893402", "denniscarmelina@1975@gmail.com"],
    ["", "ELD. EARL AÑONUEVO", "0956-9147711", "earl_anonuevo@yahoo.com"],
    ["", "ELD. ROMEO DUMLAO", "0949-5608791", "yayaydumlao@gmail.com"],
    ["", "ELD. ENRICO ESQUIERDO", "0991-0499413", "enricoesquierdo0518@gmail.com"],
    ["CHURCH DEACONS", "", "", ""],
    ["", "DCN. DIONISIO BABATIO", "0950-1337068", "c/o ezv131@yahoo.com"],
    ["", "DCN. AGIE CANCERAN", "0906-5010936", "c/o ezv131@yahoo.com"],
    ["", "DCN. DHAVIS DADES", "0956-3689892", "dhavisdades23@gmail.com"],
    ["", "DCN. JULE FUÑE", "0916-4263152", "coverwell@rocketmail.com"],
    ["", "DCN. JOEL CONSTANTINO", "0966-9703315", "constantinojoel4@gmail.com"],
    ["", "DCN. JAIME PAULINO", "0917-5755601", "c/o ezv131@yahoo.com"],
    ["SOCIAL MEDIA ACCOUNTS", "", "", ""],
    ["Account", "", "Address", ""],
    ["WEBSITE", "", "https://citybiblechurch.org.ph/", ""],
    ["CITY BIBLE GREEN HEIGHTS (FB PAGE)", "", "www.facebook.com/citybiblechurch.sermons/", ""],
    ["ONLINE PREACHING MINISTRY by PTR JIM GUSTILO", "", "https://www.facebook.com/pastorjimgustilo", ""],
    ["", "", "https://www.youtube.com/c/jimgustilo", ""],
    ["STRETCH MINISTRY (FB PAGE)", "", "https://www.facebook.com/stretchMinistry024", ""],
    ["BEYOND MINISTRY (FB PAGE)", "", "https://www.facebook.com/beyondmin.cbc", ""],
    ["MNASON MINISTRY (FB PAGE)", "", "https://www.facebook.com/MnasonMinistry", ""],
    ["CBC EVANGELISTIC BIBLE STUDY (FB PAGE)", "", "https://www.facebook.com/CBCLakeviewEBS", ""],
    ["CITY BIBLE CHURCH BULLETIN BOARD (FB GROUP)", "", "www.facebook.com/groups/cbcbulletin/", ""],
    ["SINGLE PROFESSIONAL MINISTRY (FB GROUP)", "", "www.facebook.com/groups/cbcspm/", ""],
    ["CBC YOUTH (FB GROUP)", "", "https://www.facebook.com/cbcyouthbulletin", ""],
  ];

  const nationwideDirectoryRows = [
    ["CITY BIBLE CHURCH ORGANIZATION NATIONWIDE", "", "", ""],
    ["Church", "Pastor", "Contact Number", "Church Address"],
    ["MEGA MANILA AREA", "", "", ""],
    ["CBC  GREEN HEIGHTS - MAIN", "PTR. JAIME GUSTILO", "0917-1747797", "5 CAMELLA ST. PATDU COMPOUND, SOUTH GREEN HEIGHTS, PUTATAN, MUNTINLUPA CITY"],
    ["", "PTR. HARRY SINGSON", "0923-3505754", "5 CAMELLA ST. PATDU COMPOUND, SOUTH GREEN HEIGHTS, PUTATAN, MUNTINLUPA CITY"],
    ["", "PTR. ROLDAN ORTEGA", "0951-9993012", "5 CAMELLA ST. PATDU COMPOUND, SOUTH GREEN HEIGHTS, PUTATAN, MUNTINLUPA CITY"],
    ["CBC LAS PINAS", "PTR. RODEL REYES", "0927-1530224", "B8 L16 MARCOS ALVARES AVENUE, MANUELA HOMES, TALON 5, LAS PINAS CITY"],
    ["", "PTR. BENJIE MANULIT-ASSOC", "0946-2256674", "B8 L16 MARCOS ALVARES AVENUE, MANUELA HOMES, TALON 5, LAS PINAS CITY"],
    ["CBC PASEO DE CARMONA", "PTR. VICTOR  GUECO", "0925-3023137", "LOT-L UNIT-5, PASEO DE CARMONA, BRGY. MADUYA, CARMONA CITY, CAVITE"],
    ["CBC SOUTHVILLE 3", "ELD. GEORGIE MALATE - OIC", "0997-1970084", "B49  L25  PHASE 3, SOUTHVILLE 3, POBLACION, MUNTINLUPA CITY"],
    ["CBC TAGUIG", "PTR. LEONARDO  ABRASALDO", "0945-5479764", "274 MLQ ST., PUROK 3, BAGUMBAYAN, TAGUIG CITY"],
    ["CBC TERRAVERDE", "PTR. JERRY VELDAD", "0969-5302786", "B21  L37  PHASE 4, TERRAVERDE RESIDENCES, CARMONA CITY"],
    ["CBC ALTA TIERRA", "PTR. VICENTE VICENTINO", "0918-4202464", "B65 63 ALTA TIERRA HOMES, GMA, CAVITE"],
    ["CBC BULIHAN", "PTR. ALBERT CAMPO", "0943-0679001", "B20 L17 PHASE 1A, BRGY. ACACIA 1, BULIHAN, SILANG, CAVITE"],
    ["LUZON", "", "", ""],
    ["CBC BOLINAO - CONCORDIA", "BRO. ALBERT DELOS SANTOS  - OIC", "0963-2341092", "P. CALADO ST., CONCORDIA, BOLINAO, PANGASINAN"],
    ["CBC BOLINAO - ESTANZA", "DCN. HERMENIANO CARDINES JR.  - OIC", "0956-6973014/0912-4974598", "ESTANZA, BOLINAO, PANGASINAN"],
    ["CBC BOLINAO - TINUMRONG", "SIS. MELINDA BORINES - OIC", "0945-8509027", "TINUMRONG, ARNEDO, BOLINAO, PANGASINAN"],
    ["CBC LEMERY", "PTR. MELCHOR TARNATE", "0977-7461372", "BRGY. MATINGGAIN I, LEMERY, BATANGAS"],
    ["", "PTRA. FEBE TARNATE-ASSOC", "0927-6403525", "BRGY. MATINGGAIN I, LEMERY, BATANGAS"],
    ["CBC LIPA", "PTR. STEVE VERGARA", "0995-3591148", "PRK. 2 BRGY. BALINTAWAK, LIPA CITY, BATANGAS"],
    ["VISAYAS", "", "", ""],
    ["CBC NEGROS - KABANKALAN", "DCN. DENNIS DUMALAGAN - OIC", "0992-1579868", "HACIENDA BINO , BRGY. ORONG, KABANKALAN, NEGROS OCCIDENTAL"],
    ["MINDANAO", "", "", ""],
    ["CBC DIGNADICE", "PTR. MOISES VILLAR", "0936-1476437", "DIGNADICE, POLOMOLOK, SOUTH COTABATO"],
    ["CBC SILWAY 8", "PTR. RICHARD ALMORFE", "0916-8768377/ 0985-2002306", "PRK. MASIGLA SILWAY 8, POLOMOLOK, SOUTH  COTABATO"],
    ["CBC STA. CRUZ", "PTR. VICENTE LEPSIA", "0967-7110153/ 0949-4937950", "PRK. MASIPAG, BRGY. STA CRUZ, KORONADAL CITY"],
    ["", "PTR. REYNALDO LEPSIA-ASSOC", "0909-4062085", "PRK. MASIPAG, BRGY. STA CRUZ, KORONADAL CITY"],
    ["CBC SULTAN KUDARAT", "PTR. ALLAN GULIBAN", "0975-3992459", "PRK. MANGGA BRGY. SEPAKA, BAGUMBAYAN, SULTAN KUDARAT"],
    ["CBC KATIPUNAN", "PTR. RANNEL PAMA", "0936-2970366", "PRK. KATIPUNAN, BRGY. GPS, KORONADAL CITY"],
    ["CBC SAN ISIDRO", "PTR. ROLLY BATACANDO SR.", "0975-5441290", "BRGY. SAN ISIDRO, KORONADAL CITY"],
    ["CBC TUPI - TUBENG", "PTR. ROMEO LAGSIL", "0910-0210391", "BRGY. TUBENG TUPI, SOUTH  COTABATO"],
    ["", "PTR. SAMUEL SEGUIRO - ASSOC", "0965-9552540", "BRGY. TUBENG TUPI, SOUTH  COTABATO"],
    ["", "PTRA. DANIELA SUANA - ASSOC", "0931-9764511", "BRGY. TUBENG TUPI, SOUTH  COTABATO"],
    ["CBC TUPI - MAMBUSONG", "PTR. RUEL MOLINOS", "0930-7103787", "MAMBUSONG 2, BRGY. CEBUANO, TUPI, SOUTH COTABATO"],
    ["CBC CALOOCAN KORONADAL", "PTR. RUEL MOLINOS", "0930-7103787", "PRK BAGACAY, BRGY. CALOOCAN,  KORONADAL CITY"],
    ["CBC TUPI - CLOD", "PTR. DOMINGO DASON", "0965-2737776", "SITIO CLOD, BRGY. LUNEN, TUPI, SOUTH COTABATO"],
    ["CBC ZAMBOANGA CITY", "PTR. RICHARD ALMORFE", "0916-8768377/ 0985-2002306", ""],
  ];

  const sections = [
    {
      id: "legal",
      title: "Legal",
      type: "links",
      links: [
        {
          id: "terms",
          title: "Terms of Service",
          url: termsUrl,
          icon: "document-text-outline",
        },
        {
          id: "privacy",
          title: "Privacy Policy",
          url: privacyUrl,
          icon: "shield-checkmark-outline",
        },
      ],
    },
    {
      id: "discipleship",
      title: "CBC 7-Step Discipleship Process",
      type: "text",
      body:
        "In light of the Great Commission of the Lord, City Bible Church has always been intentional in making disciples of the Lord Jesus Christ starting in the City of Muntinlupa, to Metro and Mega Manila, all over the Philippines, and beyond. After three decades of biblical preaching, praying, training and experience, CBC has developed a very clear and tested roadmap to bring our membership from being disciples into disciple-makers, by God’s grace.\n\n" +
        "The following are the brief description of the processes shown in the diagram on the previous page:\n\n" +
        "1. ASSESSMENT. The potential disciple which is captured by our ministries or programs shall be assessed and be sorted into a new believer or transferee. CBC’s method of recruitment, but not limited to the following list, are as shown below:\n" +
        "Online Preaching, Sunday Service, Home Bible Study, Outreaches and Evangelistic Drives\n\n" +
        "2. ASSIMILATION. The potential disciple shall be assimilated into church life and shall be put into proper programs offered by the church. Programs offered for the new believers and transferees, whichever is appropriate based on the assessment, are as follows:\n" +
        "Programs: Evangelistic BS, Care Group Connection\n\n" +
        "3. AFFIRMATION. After completing the basic church curriculum and being integrated to our care groups, the potential disciple can affirm his or her faith in Christ and membership in CBC by completing the programs listed below. The Pastor, Elders or Mature Leader shall confirm conversion of the potential believer.\n" +
        "New Believer's Class, Baptism Rites, Church Membership\n\n" +
        "4. AFFILIATION. After the potential disciple has affirmed himself as a baptized believer of the Lord Jesus Christ and has become a member of the body of Christ in City Bible Church, he can now be classified as a disciple of the Lord. His or her relationship with fellow disciples can be further deepened by the following:\n" +
        "Growth Class, Microgroups, Intentional Discipleship, Relationship-building\n\n" +
        "5. ACTIVATION. Now that the disciple is fully integrated in the church by having completed all the basic trainings and perpetual fellowship and accountability with fellow believers, he or she needs to discover his or her gifts in order to witness and serve God and others by undergoing these programs:\n" +
        "Doctrines of Grace, Gifts Seminar, Ministry Classes\n\n" +
        "6. LEADERSHIP I. Should the disciple seek to serve God in a deeper manner and has found a special calling in a certain ministry, he or she may proceed with the following ministry training:\n" +
        "Hermeneutics, City Discipleship, Theology 1\n\n" +
        "7. LEADERSHIP II. This set of programs is reserved for those whose calling is on the pastoral ministry, eldership, deaconship, or the like:\n" +
        "Homiletics, Pastoral Sending, Church Planting",
    },
    {
      id: "covenant",
      title: "My Covenant with God",
      type: "text",
      body:
        "Heavenly Father,\n" +
        "Having recognized that God has elected me to be a part of the family of God in City Bible Church, I am making this solemn commitment to do the following:\n\n" +
        "On Church Involvement:\n" +
        "1. I will faithfully attend Sunday services and other major activities of CBC.\n" +
        "2. I will try to involve myself in small groups/discipleship groups/Bible study groups during the week so that I can ensure a consistent spiritual growth.\n\n" +
        "On Personal Devotion:\n" +
        "1. I will maintain an intimate relationship with God through daily meditation, prayer, and Bible reading.\n" +
        "2. I will guard my quiet moments with God by scheduling a specific time during the day and designating a specific place in my office or home for my daily devotions.\n\n" +
        "On Financial Support:\n" +
        "1. I will faithfully and honestly set aside my faith offerings from my income.\n" +
        "2. Recognizing that CBC is my spiritual family, I will continue to send my faith offerings to CBC even if I have gone abroad or have been assigned to other cities or provinces in the Philippines.\n\n" +
        "On Holiness and Sexual Purity:\n" +
        "1. I will not engage in pre-marital sex or sex outside marriage while I am a member of CBC.\n" +
        "2. I will not get an unbelieving person to be my lifetime partner.\n" +
        "3. I will maintain personal holiness by keeping my mind and body pure and holy before God.\n\n" +
        "On Accountability:\n" +
        "1. I will allow my pastor and mature church leaders/workers to ‘shepherd’ me by accepting their reminders, rebukes, admonitions, and even discipline in case I stray from the path of righteousness.\n" +
        "2. I will be open about my spiritual struggles to my pastor or mature church leaders so that they can pray for me and guide me.\n" +
        "3. I will inform the church leadership in case I need to go on leave for a long time.\n\n" +
        "On Love Support:\n" +
        "1. I will be loyal to my church. I will not compare it with other churches nor try to gossip about the weaknesses of our programs, our leaders or our members.\n" +
        "2. I will seek peaceful and harmonious relationships with my churchmates.\n" +
        "3. I will try to know them and be involved in their lives by praying for them and seeking close friendships with them.\n" +
        "4. I will help those who are in need.\n" +
        "5. I will not take advantage of the goodness of my churchmates by looking for ways on how I may get something from them.\n\n" +
        "Please help me fulfill my covenant with You. In Jesus’ name. Amen.\n\n" +
        "Signature Over Printed Name: ________________________________ Date: ___________________",
    },
    {
      id: "poimen",
      title: "The Poimen",
      type: "text",
      body:
        "We focused on two ministry gears in 2023, but this year we will delve into five powerful aspects of our church to ensure the advancement of the glorious gospel of the Lord Jesus Christ and the vision of CBC for 2024 in our beloved country.\n\n" +
        "Did you know that our focus for this year is closely connected to our past experiences and crises? Despite walking through fiery trials in recent months, Romans 8:28 remains true for us. In fact, those tumultuous times have made us wiser, more holistic, intentional, and dynamically vivid. This is why we launched the S.M.A.R.T. church this year, and we are convinced that this direction is balanced, appropriate, and forward-thinking.\n\n" +
        "We are certain that there is a need for us to focus. Recently, we have been bombarded by trials from all sides, and some of our mighty members have fallen, become dismayed, and halted in serving the church. However, I believe that CBC church can raise up more faithful leaders, supporters, and members. I love the doctrine of the remnants of the faithful church. Our commitment is to continue the spiritual fight to show the world that we are not like pandesal—bloated but lacking powerful substance. We are committed to maintaining the organic system that we have always believed in and displayed. We cannot take the route of shortcuts and manipulation because we believe that the process is the key. I am sure that, by His grace, we will continue and never compromise the long-standing mandate of the church in the midst of mediocrity, atheism, and a loveless world.\n\n" +
        "Brethren, never give up easily on the purposes of God for us, and always remind yourselves that nothing should move us. In fact, we should always give ourselves fully to the work of the Lord because we know that our labor in the Lord is not in vain (1 Cor. 15:58).",
    },
    {
      id: "statement",
      title: "Statement of Faith",
      type: "text",
      body:
        "City Bible Church\n" +
        "Statement of Faith\n\n" +
        "I. We all accept without question that the 66 books of the Bible, in both Old and New Testament, is the inspired Word of God to man. It is the ultimate authority of faith and practice for the Christian church today (Psalm 119:160; 2 Timothy 3:16).\n\n" +
        "II. We believe in one God, revealed in three persons of the Father, the Son, and the Holy Spirit, as the sovereign Creator and Ruler of the universe. The three persons of the Godhead are all equal in essence and in power (I John 5:7).\n\n" +
        "III. We believe in the deity of Jesus Christ, His miraculous virgin birth, and His fulfilling of the prophecy of the coming of the Messiah. He is the God-man who was crucified to atone for the sins of His people. He was resurrected from the dead. He now reigns in glory, and He will visibly return to this world to judge and to take His saints with Him in heaven (Isaiah 9:6; John 1:14; John 3:16; Acts 17:31; Revelation 22:20).\n\n" +
        "IV. We believe that man is spiritually dead and under the curse of sin. He cannot save his own self apart from the regenerating power and grace of God (Romans 3:23; Romans 3:10).\n\n" +
        "V. We believe in the sovereign right of God, in which, “He does according to His will in the army of heaven and among the inhabitants of the earth. No one can restrain His hand or say to Him, “what have you done?” (Daniel 4:35).\n\n" +
        "VI. We believe that God has chosen us “in Him before the creation of the world to be holy and blameless in his sight” (Ephesians 1:4).\n\n" +
        "VII. We believe in God’s irresistible Grace - that those whom God has chosen unto salvation and all for whom Christ died, will be drawn of God by absolutely no merit of their own and be saved through faith (John 6:44; Ephesians 2:8-9).\n\n" +
        "VIII. We believe in eternal security in which all for whom Jesus Christ died can never be lost again. Those who truly receive God’s salvation are sealed by the Holy Spirit and will endure to the end (John 10:27; Ephesians 1:13; 2 Corinthians 1:22).\n\n" +
        "IX. We believe in the indivisible church, the Body of Christ, bound together by the Holy Spirit, and consisting only of those who are born from above, for whom Christ now makes intercession in heaven (I Corinthians 12:12-31).\n\n" +
        "X. We believe that those who are born of God cannot continue to live in sin. They live holy lives and abide in His words. They do not live as the people of the world do. Their changed life is a distinguishing mark that they are truly citizens of heaven (2 Corinthians 5:17; I John 3:9).",
    },
    {
      id: "directory-main",
      title: "Main Leadership and Administration Directory",
      rows: mainDirectoryRows,
      type: "table",
    },
    {
      id: "directory-nationwide",
      title: "Nationwide Churches Directory",
      rows: nationwideDirectoryRows,
      type: "table",
    },
  ];

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isGroupRow = (row: string[]) =>
    row[0] && !row[1] && !row[2] && !row[3];

  const isHeaderRow = (row: string[]) =>
    row[0].toLowerCase() === "designation" ||
    row[0].toLowerCase() === "church" ||
    row[0].toLowerCase() === "account";

  const isWebLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
  };

  const toWebUrl = (value: string) => {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => {
          const open = !!openSections[section.id];
          return (
            <View key={section.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <Pressable
                style={styles.cardHeader}
                onPress={() => toggleSection(section.id)}
              >
                <Text style={[styles.title, { color: colors.text }]}>
                  {section.title}
                </Text>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.text}
                  style={styles.cardHeaderIcon}
                />
              </Pressable>
              {open ? (
                section.type === "table" ? (
                  <View style={styles.table}>
                    {section.rows.map((row, index) => {
                      if (row.every((cell) => !cell)) return null;
                      if (isGroupRow(row)) {
                        return (
                          <Text key={`${section.id}-group-${index}`} style={[styles.tableGroup, { color: colors.text }]}>
                            {row[0]}
                          </Text>
                        );
                      }
                      const header = isHeaderRow(row);
                      return (
                        <View
                          key={`${section.id}-row-${index}`}
                          style={[
                            styles.tableRow,
                            { borderBottomColor: colors.border },
                            header && [
                              styles.tableHeaderRow,
                              {
                                backgroundColor: isDark ? "#1f2430" : "#f5f5f5",
                              },
                            ],
                          ]}
                        >
                          {row.map((cell, colIndex) => (
                            <Text
                              key={`${section.id}-${index}-${colIndex}`}
                              style={[
                                styles.tableCell,
                                colIndex === 0 && styles.tableCellFirst,
                                colIndex === 3 && styles.tableCellLast,
                                header && styles.tableHeaderText,
                                isWebLink(cell) && styles.tableLink,
                                { color: colors.text },
                              ]}
                              onPress={
                                isWebLink(cell)
                                  ? () => Linking.openURL(toWebUrl(cell))
                                  : undefined
                              }
                            >
                              {cell}
                            </Text>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                ) : section.type === "links" ? (
                  <View style={styles.linkList}>
                    {section.links.map((link, index) => (
                      <Pressable
                        key={link.id}
                        style={[
                          styles.linkRow,
                          index === 0 && styles.linkRowFirst,
                          { borderTopColor: colors.border },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: "/legal",
                            params: { title: link.title, url: link.url },
                          })
                        }
                      >
                        <View style={styles.linkRowLeft}>
                          <Ionicons name={link.icon} size={18} color={colors.text} />
                          <Text style={[styles.linkRowText, { color: colors.text }]}>
                            {link.title}
                          </Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color={colors.border} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.body, { color: colors.text }]}>
                    {section.body}
                  </Text>
                )
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, gap: 10 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardHeaderIcon: { marginLeft: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 20 },
  linkList: { gap: 0 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  linkRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  linkRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkRowText: { fontSize: 15, fontWeight: "600" },
  table: { gap: 8 },
  tableGroup: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  tableRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tableHeaderRow: {
    borderBottomColor: "#bfc6d1",
  },
  tableCell: {
    fontSize: 12,
    flex: 1,
  },
  tableCellFirst: { flex: 1.2 },
  tableCellLast: { flex: 1.6 },
  tableHeaderText: { fontWeight: "700" },
  tableLink: { color: ACCENT_COLOR, textDecorationLine: "underline" },
});
