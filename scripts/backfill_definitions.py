import os
import sys
import time
import logging
from sqlalchemy import text
from sqlmodel import Session, select

# Set up logging to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill")

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.app import get_engine
from src.app.models import DailyWord
from src.app.services import fetch_word_definition

def run_migration_and_backfill():
    logger.info("Initializing database migration and backfill...")
    engine = get_engine()

    # 1. Run Schema Migration
    with Session(engine) as session:
        if engine.dialect.name == "sqlite":
            cursor = session.connection().execute(text("PRAGMA table_info(dailyword)"))
            columns = [row[1] for row in cursor.fetchall()]
            if "definition" not in columns:
                logger.info("Adding 'definition' column to 'dailyword' table...")
                session.connection().execute(
                    text("ALTER TABLE dailyword ADD COLUMN definition TEXT")
                )
                session.commit()
                logger.info("Column added successfully.")
            else:
                logger.info("'definition' column already exists.")

    # 2. Backfill definitions
    with Session(engine) as session:
        stmt = select(DailyWord).where(DailyWord.definition == None)
        words_to_backfill = session.exec(stmt).all()

        if not words_to_backfill:
            logger.info("No words to backfill. All existing daily words have definitions.")
            return

        logger.info("Found %d words to backfill definitions for.", len(words_to_backfill))

        success_count = 0
        for dw in words_to_backfill:
            logger.info("Fetching definition for '%s' (date: %s)...", dw.word, dw.date)
            try:
                definition = fetch_word_definition(dw.word)
                if definition:
                    dw.definition = definition
                    session.add(dw)
                    session.commit()
                    logger.info("Saved: %s", definition)
                    success_count += 1
                else:
                    logger.warning("No definition found for '%s'", dw.word)
            except Exception as e:
                logger.error("Error processing '%s': %s", dw.word, e)

            # Rate-limiting delay to respect the free API
            time.sleep(1.0)

        logger.info(
            "Finished backfilling. Successfully updated %d/%d words.",
            success_count,
            len(words_to_backfill)
        )

if __name__ == "__main__":
    run_migration_and_backfill()
