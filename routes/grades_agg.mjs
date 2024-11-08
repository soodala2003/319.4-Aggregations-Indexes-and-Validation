import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */

// Get the weighted average of a specified learner's grades, per class
router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");
  
  let result = await collection
    .aggregate([
      {
        $match: { learner_id: Number(req.params.id) },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$class_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        project: {
          _id: 0,
          class_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    ])
    .toArray();
  
  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});
  
router.get("/learner/:id/avg", async (req, res) => {
    try {
      const collection = await db.collection("grades");
      const result = await collection
        .aggregate([
          {
            $match: { learner_id: Number(req.params.id) },
          },
          {
            $unwind: "$scores",
          },
          {
            $group: {
              _id: "$class_id",
              quizAvg: {
                $avg: {
                  $cond: {
                    if: { $eq: ["$scores.type", "quiz"] },
                    then: "$scores.score",
                    else: "$$REMOVE",
                  },
                },
              },
              examAvg: {
                $avg: {
                  $cond: {
                    if: { $eq: ["$scores.type", "exam"] },
                    then: "$scores.score",
                    else: "$$REMOVE",
                  },
                },
              },
              homeworkAvg: {
                $avg: {
                  $cond: {
                    if: { $eq: ["$scores.type", "homework"] },
                    then: "$scores.score",
                    else: "$$REMOVE",
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              class_id: "$_id",
              avg: {
                $sum: [
                  { $multiply: [{ $ifNull: ["$examAvg", 0] }, 0.5] }, // 50% for exam
                  { $multiply: [{ $ifNull: ["$quizAvg", 0] }, 0.3] }, // 30% for quiz
                  { $multiply: [{ $ifNull: ["$homeworkAvg", 0] }, 0.2] }, // 20% for homework
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalAvg: { $avg: "$avg" },
            },
          },
          {
            $project: {
              _id: 0,
              overallAverage: "$totalAvg",
            },
          },
        ])
        .toArray();
      if (result.length === 0) {
        return res.status(404).send("Learner's average not found.");
      }
      console.log("Result:", result);
      res.status(200).send(result[0]);
    } catch (error) {
      console.error("Error in /learner/:id/avg route:", error);
      res.status(500).send("Internal Server Error.");
    }
});

router.get("/stats", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $unwind: { path: "$scores"},
      },
      {
        $group: {
          _id: "learner_id",
          quizAvg: {
            $avg: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          examAvg: {
            $avg: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homeworkAvg: {
            $avg: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          learner_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $ifNull: ["$examAvg", 0] }, 0.5] }, // 50% for exam
              { $multiply: [{ $ifNull: ["$quizAvg", 0] }, 0.3] }, // 30% for quiz
              { $multiply: [{ $ifNull: ["$homeworkAvg", 0] }, 0.2] }, // 20% for homework
            ],
          },
          totalLearners: [{ $count: "$learner_id" }],
          totalAvg: { $divide: ["$avg", "$totalLearners"] },
        },
      },
    ])
    .toArray();

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});


export default router;