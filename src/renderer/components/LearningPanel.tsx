import { useCallback, useEffect, useState } from "react";
import type { ColorNode } from "../../shared/colorEngine";
import type { Lesson } from "../../shared/learning";
import {
  checkLessonStep,
  COLOR_LESSONS,
  DEFAULT_PRACTICE_TARGETS,
  getLessonById,
  getRecipeById,
  GRADE_RECIPES,
  type LessonId,
  type RecipeId
} from "../../shared/learning";
import type { ChromaProject } from "../../shared/project";

interface LearningPanelProps {
  project: ChromaProject;
  onApplyRecipe: (nodes: ColorNode[]) => void;
  onStartLesson: (lessonId: LessonId) => void;
  onCompleteLesson: (lessonId: LessonId) => void;
  onStartPractice: (targetId: string) => void;
  onUpdateLessonStep: (stepId: string, passed: boolean, actualValue?: number) => void;
  completedLessons: LessonId[];
  activeLessonId?: LessonId;
  activePracticeTargetId?: string;
}

export function LearningPanel({
  project,
  onApplyRecipe,
  onStartLesson,
  onCompleteLesson,
  onStartPractice,
  onUpdateLessonStep,
  completedLessons,
  activeLessonId,
  activePracticeTargetId
}: LearningPanelProps) {
  const [selectedTab, setSelectedTab] = useState<"lessons" | "recipes" | "practice">("lessons");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeLessonStepIndex, setActiveLessonStepIndex] = useState(0);
  const [activeStepResult, setActiveStepResult] = useState<{ passed: boolean; actualValue?: number } | null>(null);

  useEffect(() => {
    if (activeLessonId) {
      const lesson = getLessonById(activeLessonId);
      setActiveLesson(lesson ?? null);
      setActiveLessonStepIndex(0);
    } else {
      setActiveLesson(null);
      setActiveLessonStepIndex(0);
    }
  }, [activeLessonId]);

  const handleSelectLesson = useCallback((lessonId: LessonId) => {
    onStartLesson(lessonId);
  }, [onStartLesson]);

  const handleSelectRecipe = useCallback((recipeId: RecipeId) => {
    const recipe = getRecipeById(recipeId);
    if (recipe) {
      onApplyRecipe(recipe.nodes);
    }
  }, [onApplyRecipe]);

  const handleSelectTarget = useCallback((targetId: string) => {
    onStartPractice(targetId);
  }, [onStartPractice]);

  const handleNextStep = useCallback(() => {
    if (!activeLesson) return;

    const currentStep = activeLesson.steps[activeLessonStepIndex];
    const checkResult = checkLessonStep(activeLesson, currentStep.id, project.nodes);
    setActiveStepResult(checkResult);
    onUpdateLessonStep(currentStep.id, checkResult.passed, checkResult.actualValue);

    if (activeLessonStepIndex < activeLesson.steps.length - 1) {
      setTimeout(() => {
        setActiveLessonStepIndex((prev) => prev + 1);
        setActiveStepResult(null);
      }, 800);
    } else {
      onCompleteLesson(activeLesson.id);
    }
  }, [activeLesson, activeLessonStepIndex, project.nodes, onUpdateLessonStep, onCompleteLesson]);

  const handleSkipLesson = useCallback(() => {
    setActiveLesson(null);
    setActiveLessonStepIndex(0);
    setActiveStepResult(null);
  }, []);

  return (
    <aside className="learning-panel">
      <div className="learning-tabs">
        <button
          type="button"
          className={selectedTab === "lessons" ? "is-active" : ""}
          onClick={() => setSelectedTab("lessons")}
        >
          Lessons
        </button>
        <button
          type="button"
          className={selectedTab === "recipes" ? "is-active" : ""}
          onClick={() => setSelectedTab("recipes")}
        >
          Recipes
        </button>
        <button
          type="button"
          className={selectedTab === "practice" ? "is-active" : ""}
          onClick={() => setSelectedTab("practice")}
        >
          Practice
        </button>
      </div>

      <div className="learning-content">
        {selectedTab === "lessons" && !activeLesson && (
          <div className="learning-section">
            <h3>Interactive Lessons</h3>
            <p className="learning-description">
              Learn color grading through hands-on lessons. Each lesson guides you through real controls.
            </p>
            <div className="lesson-list">
              {COLOR_LESSONS.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  className={`lesson-card ${completedLessons.includes(lesson.id) ? "is-completed" : ""}`}
                  onClick={() => handleSelectLesson(lesson.id)}
                >
                  <span className="lesson-title">{lesson.title}</span>
                  <span className="lesson-description">{lesson.description}</span>
                  {completedLessons.includes(lesson.id) && (
                    <span className="lesson-badge">Completed</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "lessons" && activeLesson && (
          <div className="learning-section">
            <button type="button" className="back-button" onClick={handleSkipLesson}>
              Back to Lessons
            </button>
            <h3>{activeLesson.title}</h3>
            <p className="learning-description">{activeLesson.description}</p>
            <div className="lesson-progress">
              <span>Step {activeLessonStepIndex + 1} of {activeLesson.steps.length}</span>
              <div className="lesson-progress-bar">
                <div
                  className="lesson-progress-fill"
                  style={{ width: `${((activeLessonStepIndex + 1) / activeLesson.steps.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="lesson-step">
              <p className="lesson-instruction">
                {activeLesson.steps[activeLessonStepIndex].instruction}
              </p>
              {activeStepResult && (
                <div className={`lesson-step-result ${activeStepResult.passed ? "is-passed" : "is-failed"}`}>
                  {activeStepResult.passed ? "Passed" : "Keep trying"}
                  {activeStepResult.actualValue !== undefined && (
                    <span> (value: {activeStepResult.actualValue.toFixed(3)})</span>
                  )}
                </div>
              )}
            </div>
            <div className="lesson-actions">
              <button type="button" className="primary-action" onClick={handleNextStep}>
                {activeLessonStepIndex < activeLesson.steps.length - 1 ? "Next Step" : "Complete Lesson"}
              </button>
              <button type="button" onClick={handleSkipLesson}>
                Skip
              </button>
            </div>
          </div>
        )}

        {selectedTab === "recipes" && (
          <div className="learning-section">
            <h3>Grade Recipes</h3>
            <p className="learning-description">
              Apply starter recipes to your project. Each recipe creates inspectable nodes you can modify.
            </p>
            <div className="recipe-list">
              {GRADE_RECIPES.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  className="recipe-card"
                  onClick={() => handleSelectRecipe(recipe.id)}
                >
                  <span className="recipe-name">{recipe.name}</span>
                  <span className="recipe-description">{recipe.description}</span>
                  <div className="recipe-tags">
                    {recipe.tags.map((tag) => (
                      <span key={tag} className="recipe-tag">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "practice" && (
          <div className="learning-section">
            <h3>Practice Targets</h3>
            <p className="learning-description">
              Practice grading to measurable targets. Your scope readings will show how close you are to the goal.
            </p>
            <div className="practice-list">
              {DEFAULT_PRACTICE_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className={`practice-card ${activePracticeTargetId === target.id ? "is-active" : ""}`}
                  onClick={() => handleSelectTarget(target.id)}
                >
                  <span className="practice-name">{target.name}</span>
                  <span className="practice-description">{target.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
