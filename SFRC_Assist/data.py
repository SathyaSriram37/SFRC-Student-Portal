import sqlite3


def query(sql,args=()):

    conn=sqlite3.connect("college.db")

    cursor=conn.cursor()

    cursor.execute(sql,args)

    data=cursor.fetchall()

    conn.close()

    return data



def get_departments(level,type):

    return query(
    "SELECT name FROM departments WHERE level=? AND type=?",
    (level,type)
    )



def get_department_details(name):

    return query(
    "SELECT details FROM departments WHERE name=?",
    (name,)
    )



def get_faculty(dept):

    return query(
    "SELECT name,designation FROM faculty WHERE department=?",
    (dept,)
    )



def get_guides():

    return query(
    "SELECT name,specialization FROM phd_guides"
    )



def get_transport():

    return query(
    "SELECT route,stops FROM transport"
    )



def get_fee(dept):

    return query(
    "SELECT amount FROM fees WHERE department=?",
    (dept,)
    )