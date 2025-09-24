from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
import psycopg2
import re

departments = ['BEH','BC', 'BUS','GBUS', 'CPA', 'CM', 'EGR', 'GCSL', 'HLSS', 'HONR', 'LBA', 'GTHE', 'THE']
pattern = re.compile(r'^([A-Z]+)-(\d{3}[A-Z]?)')

# Connect to the PostgreSQL database
conn = psycopg2.connect(
    #Insert database credential here
    host="00.000.000.00",
    port="5432",
    dbname="postgres",
    user="postgres",
    password="##########"
)

cursor = conn.cursor()
driver = webdriver.Chrome()
# Get the term code from the database
# Assuming you have a table named 'courses' with a column 'Term' and 'course_id'
cursor.execute('SELECT "Term" FROM courses WHERE course_id = 1')
result = cursor.fetchone()
if result:
    termCode = result[0]
    print(termCode)


#Go through each department and get the syllabus ID
for dept in departments:
    url = f'https://syllabi.oru.edu/?term={termCode}&dept={dept}'
    print(url)
    
    driver.get(url)

    element = driver.find_elements(By.TAG_NAME, 'a')

    for link in element:
        match = pattern.match(link.text.strip())
        href = link.get_attribute('href')
        if href and "?id=" in href:
            syllabus_id = href.split('=')[1]
            if match:
                subject, course = match.group(1), match.group(2)
                print(subject, course, " = ", syllabus_id)
                # Populate the syllabus_id in the database
                cursor.execute('UPDATE courses SET syllabus_id = %s WHERE "Subject" = %s AND "Course" = %s;',
                    (syllabus_id, subject, course))
            
            
conn.commit()
cursor.close()

conn.close()
