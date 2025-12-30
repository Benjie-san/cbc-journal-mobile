import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function TutorialScreen() {
  const { colors } = useTheme();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const sections = [
    {
      id: "how-to-use",
      title: "How to Use the CBC Journal 2026",
      body:
        "Daily Entry Pages\n" +
        "The Daily Entry Pages will be where you will make your daily entries as you follow the Bible Reading Plan using the SOAP Method. Alternatively, you can also use these pages to record learnings from the nightly OPM.\n\n" +
        "Devotion:\n" +
        "STEP 1: Find the Scriptures for today in the Bible Reading Plan.\n" +
        "STEP 2: Read the passages. Read with an open heart as Jesus gives you word of encouragement, direction, and correction (2 Timothy 3:16).\n" +
        "STEP 3: When Jesus gives you a life lesson, turn to a fresh page in your Daily Entry pages to record what He has just shown you.\n\n" +
        "SCRIPTURE: Write down the main Scripture. You can find the particular text for the day in the Bible Reading Plan section of this Journal.\n" +
        "OBSERVATION: Write what you see in the Scripture. You can find helpful tips in the Making the Best Use of this Journal section of this Journal.\n" +
        "APPLICATION: Write how you will be different today because of what you have read. You can find helpful tips in the Making the Best Use of this Journal section of this Journal.\n" +
        "PRAYER: Write a short prayer in response to the Scripture. Thank God for what He has shown you and ask for His help to obey and live out this truth today.\n\n" +
        "Give your lesson a Title for your future reference.\n\n" +
        "Online Preaching Ministry Notes:\n" +
        "STEP 1: Tune in to Ptr. Jim Gustilo’s OPM channel nightly at 8:00 PM Philippine Standard Time live on Facebook and Youtube, or watch the video at a later time from the same page on Facebook or on Youtube. You may visit these pages which are indicated in the directory.\n" +
        "STEP 2: Join the short prayer meeting with Ptr. Jim Live. You may also send any prayer request to him in the dialogue box prompting on your screen.\n" +
        "STEP 3: Take down all the notes you have learned from the preaching.\n" +
        "STEP 4: Write a short reflection about how the Word of God impacted you.\n" +
        "STEP 5: Seek ways to apply what you have learned in your daily life.\n" +
        "STEP 6: Invite, Share, Tag, and Mention your family members and friends in the OPM so that they too may share in the blessing.\n\n" +
        "Sunday Sermon Pages\n" +
        "The Sunday Sermon Pages are dedicated for the learning from Sunday Preaching.\n" +
        "STEP 1: Regularly attend Sunday services. If for some reason you cannot attend, you may tune in to Ptr. Jim’s FB page to watch the live preaching, or you may also watch it later at your convenience.\n" +
        "STEP 2: Take down all the notes you can learn from the preaching.\n" +
        "STEP 3: Write down the personal reflection on the day’s preaching.\n" +
        "STEP 4: Seek ways to apply what you have learned in your daily life.\n" +
        "STEP 5: Invite, Tag, Mention, and Share with your families and friends in our Church Services so that they too may share the blessing.\n\n" +
        "Remember:\n" +
        "This CBC Journal 2026 is designed to help you in your growth in Christ. You can be flexible on how you use it, but be sure you develop a healthy habit of spending time daily with the Lord.",
    },
    {
      id: "best-use",
      title: "Making the Best Use of this Journal",
      body:
        "We are pleased to present this greatly enhanced CBC Journal 2026. It has many features which we hope will bless you and lead you to greater fruitfulness in 2026.\n\n" +
        "Personal Verse of the Year\n" +
        "We would like you to think of a Scripture that you feel captures the theme of your life for 2026.\n\n" +
        "CBC 7-Step Discipleship Process Flowchart\n" +
        "This page serves as a guide in your progress as a member of CBC and clearly maps the exciting processes involved at each level of service to God in the church.\n\n" +
        "Bible Reading Plan\n" +
        "The Bible Reading Plan designates a passage to be read each day and includes a progress box where the reader can monitor his or her completion. Following a structured reading program is important for accountability, discipline, and systematic instruction in God’s Word. This program can be found under the Bible Reading Plan section of this journal.\n\n" +
        "To encourage consistency and accessibility, some passages have been intentionally shortened for easier daily reading. Readers are therefore encouraged to read the preceding and following verses to place each passage in its proper biblical context.\n\n" +
        "As you read, take time to reflect on the passage by asking the following questions:\n" +
        "1. Observation: What does the text say?\n" +
        "Who: Who are the people or characters involved? What are their relationships?\n" +
        "What: What happened? What actions took place? What words, phrases, or symbols stand out?\n" +
        "Where / When: Where and when does this passage occur?\n" +
        "How / Why: How did it happen? Why did they act or respond this way?\n" +
        "Structure: How is the passage organized? What is the overall mood, message, or theme?\n\n" +
        "2. Application: What should I do?\n" +
        "How does this passage change my understanding of God, myself, or the world?\n" +
        "Is there a command to obey, a promise to claim, or a warning to heed?\n" +
        "Is there any sin that needs confession or repentance? What needs to change in my life?\n" +
        "How can I live this out this week? What specific action will I take?\n" +
        "What can I share with someone else about what I have learned?\n\n" +
        "Daily Pages\n" +
        "The Daily Page will be where you will make your daily entries as you follow the Bible Reading Plan. Alternatively, you can also use these pages to write down the gems you have gleaned from the nightly Online Preaching of Pastor Jim.\n\n" +
        "Sunday Sermon Pages\n" +
        "The Sunday Sermon Pages is where you will jot down your notes from our weekly Sunday sermons. Our Sunday Sermon Pages now features a Personal Reflection Section where you can write the personal learning you have distilled from the day’s preaching, assuring the insight is secured.",
    },
  ];

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
                />
              </Pressable>
              {open ? (
                <Text style={[styles.body, { color: colors.text }]}>
                  {section.body}
                </Text>
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
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 20 },
});
